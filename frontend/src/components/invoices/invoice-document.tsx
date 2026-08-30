"use client";

import { useEffect, useRef, useState } from "react";
import type { Invoice } from "@/types/api";
import { countryName } from "@/lib/countries";
import {
  DOCUMENT_STRINGS,
  fillPlaceholders,
  type DocumentLanguage,
} from "@/lib/invoice-document-strings";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------------------------------------------------
 * The saved invoice, drawn as a page.
 *
 * Hand-drawn rather than the browser's PDF plugin in an iframe. The plugin brings its own dark
 * toolbar, its own thumbnail rail and its own zoom, none of which can be styled — the viewer ends
 * up looking like a PDF reader bolted into the page instead of part of the product. The PDF is
 * still one click away and is still the authoritative document; this is the on-screen reading of
 * the same data.
 * ------------------------------------------------------------------------ */

const ZOOM_LEVELS = [50, 75, 100, 125, 150];

/** A4 at 72dpi, the size the page is drawn at before scaling. */
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;

export function InvoiceDocument({
  invoice,
  companyName,
  contactPerson,
  fallbackRecipient,
  taxNote,
  onDownload,
}: {
  invoice: Invoice;
  companyName: string;
  contactPerson: string | null;
  /**
   * The live contact, used only where the invoice has no snapshot of its own.
   *
   * <p>Invoices written before the recipient columns existed have nothing stored, and printing
   * "no contact selected" on an invoice that plainly has one is worse than showing the contact as
   * they are now. Anything issued since carries its own snapshot and ignores this.
   */
  fallbackRecipient?: { name: string; addressLine1: string | null; postalCode: string | null; city: string | null; countryCode: string | null } | null;
  taxNote: string | null;
  onDownload: () => void;
}) {
  // null means "fit the column". A fixed 100% made an A4 page wider than the pane, so the
  // document scrolled sideways — which the reference never does, because its window is wide
  // enough for the page. Fitting gets the same result at any width.
  const [zoom, setZoom] = useState<number | null>(null);
  const [fitZoom, setFitZoom] = useState(100);
  const paneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const pane = paneRef.current;
    if (!pane || typeof ResizeObserver === "undefined") return;
    // Measured in the observer rather than during the effect body, so no state is set
    // synchronously on mount.
    const observer = new ResizeObserver(([entry]) => {
      const usable = entry.contentRect.width - 48;
      setFitZoom(Math.max(25, Math.min(150, Math.floor((usable / PAGE_WIDTH) * 100))));
    });
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  const scale = (zoom ?? fitZoom) / 100;
  // Every invoice fits one page today: nothing here paginates. The control is shown because the
  // document is a page and an operator expects to see where they are, but it stays honest about
  // there being one.
  const pageCount = 1;
  const [page, setPage] = useState(1);

  const language = (invoice.language === "de" ? "de" : "en") as DocumentLanguage;
  const s = DOCUMENT_STRINGS[language];
  const net = Number(invoice.subtotalAmount) - Number(invoice.discountAmount);

  const recipientName = invoice.recipientName ?? fallbackRecipient?.name ?? null;
  const line1 = invoice.recipientAddressLine1 ?? fallbackRecipient?.addressLine1 ?? null;
  const postal = invoice.recipientPostalCode ?? fallbackRecipient?.postalCode ?? null;
  const city = invoice.recipientCity ?? fallbackRecipient?.city ?? null;
  const country = invoice.recipientCountryCode ?? fallbackRecipient?.countryCode ?? null;

  const addressLines = [
    line1,
    invoice.recipientAddressLine2,
    [postal, city].filter(Boolean).join(" "),
    country && country !== "DE" ? countryName(country, language) : null,
  ].filter((line): line is string => Boolean(line && line.trim()));

  return (
    // Column-flex so the toolbar keeps its height and the page area takes whatever is left.
    // A fixed height here guessed at the viewport and made the whole page scroll instead.
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Page</span>
          <input
            value={page}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) setPage(Math.min(Math.max(1, next), pageCount));
            }}
            inputMode="numeric"
            aria-label="Page"
            className="h-8 w-12 rounded-lg border border-border bg-card text-center text-sm outline-none focus:border-primary"
          />
          <span className="text-sm text-muted">of {pageCount}</span>

          <button
            type="button"
            aria-label="Previous page"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="grid size-8 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronUpIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next page"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            className="grid size-8 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronDownIcon className="size-4" />
          </button>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() =>
              setZoom((z) => {
                const current = z ?? fitZoom;
                return ZOOM_LEVELS.find((level) => level > current) ?? current;
              })
            }
            className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate-100"
          >
            <ZoomInIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() =>
              setZoom((z) => {
                const current = z ?? fitZoom;
                return [...ZOOM_LEVELS].reverse().find((level) => level < current) ?? current;
              })
            }
            className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate-100"
          >
            <ZoomOutIcon className="size-4" />
          </button>
          <select
            value={zoom ?? "fit"}
            onChange={(event) =>
              setZoom(event.target.value === "fit" ? null : Number(event.target.value))
            }
            aria-label="Zoom level"
            className="h-8 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
          >
            <option value="fit">Fit ({fitZoom}%)</option>
            {ZOOM_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}%
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Download PDF"
            onClick={onDownload}
            className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate-100"
          >
            <DownloadIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* The page, scrolling inside a fixed viewport rather than growing the whole screen. A
          zoomed-in document has to stay reachable without the sidebar sliding away with it. */}
      <div ref={paneRef} className="min-h-0 flex-1 overflow-auto bg-slate-100 p-6">
        {/* Two boxes on purpose. A transform changes what is painted, never the element's own
            width and height, so a single scaled div still reserves its full A4 footprint and the
            pane scrolls in both directions around a page that visibly fits. The outer box is sized
            to the scaled result; the inner one is the page at its true size, scaled into it. */}
        <div
          className="mx-auto"
          style={{ width: PAGE_WIDTH * scale, height: PAGE_HEIGHT * scale }}
        >
        <div
          className="origin-top-left"
          style={{
            transform: `scale(${scale})`,
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
          }}
        >
          <div className="min-h-[1123px] bg-white p-14 text-[13px] leading-relaxed text-slate-800 shadow-lg">
            <p className="text-right text-lg font-semibold text-slate-900">{companyName}</p>

            <div className="mt-12 flex justify-between gap-10">
              <div>
                <p className="mb-6 border-b border-slate-200 pb-1 text-[10px] text-slate-400">
                  {companyName}
                </p>
                <p className="font-medium text-slate-900">{recipientName ?? s.noContact}</p>
                {addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>

              <dl className="w-56 shrink-0 space-y-1 text-[11px]">
                <Meta label={s.invoiceNo} value={invoice.invoiceNumber} />
                <Meta label={s.date} value={formatDate(invoice.issueDate)} />
                <Meta
                  label={invoice.servicePeriodStart ? s.servicePeriod : s.deliveryDate}
                  value={
                    invoice.servicePeriodStart
                      ? `${formatDate(invoice.servicePeriodStart)} – ${formatDate(invoice.servicePeriodEnd)}`
                      : formatDate(invoice.deliveryDate)
                  }
                />
                {invoice.reference ? <Meta label="Ref." value={invoice.reference} /> : null}
                {contactPerson ? <Meta label={s.yourContact} value={contactPerson} /> : null}
              </dl>
            </div>

            <h1 className="mt-10 text-lg font-bold text-slate-900">
              {invoice.subject || `${s.headingPrefix} ${invoice.invoiceNumber}`}
            </h1>

            {invoice.notes ? (
              <p className="mt-4 whitespace-pre-wrap">{invoice.notes}</p>
            ) : null}

            <table className="mt-8 w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-slate-300 text-left">
                  <th className="w-8 py-1.5 font-semibold">#</th>
                  <th className="py-1.5 font-semibold">{s.description}</th>
                  <th className="w-20 py-1.5 text-right font-semibold">{s.qty}</th>
                  <th className="w-24 py-1.5 text-right font-semibold">{s.unitPrice}</th>
                  <th className="w-24 py-1.5 text-right font-semibold">{s.lineTotal}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 text-slate-500">{index + 1}.</td>
                    <td className="py-2 whitespace-pre-wrap text-slate-900">{item.description}</td>
                    <td className="py-2 text-right tabular-nums">
                      {item.quantity} {item.unit ?? ""}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(item.unitPrice, invoice.currency)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(item.lineTotal, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-4 flex justify-end">
              <dl className="w-64 space-y-1 text-[12px]">
                <Total label={s.totalNet} value={formatMoney(net, invoice.currency)} />
                {Number(invoice.discountAmount) > 0 ? (
                  <Total
                    label={s.discount}
                    value={`− ${formatMoney(invoice.discountAmount, invoice.currency)}`}
                  />
                ) : null}
                <Total label={s.vat} value={formatMoney(invoice.taxAmount, invoice.currency)} />
                <div className="flex justify-between border-t border-slate-300 pt-1.5 text-[13px] font-bold text-slate-900">
                  <dt>{s.totalGross}</dt>
                  <dd className="tabular-nums">
                    {formatMoney(invoice.totalAmount, invoice.currency)}
                  </dd>
                </div>
              </dl>
            </div>

            {taxNote ? (
              <p className="mt-6 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
                {taxNote}
              </p>
            ) : null}

            {invoice.terms ? (
              <p className="mt-8 whitespace-pre-wrap text-[12px]">
                {fillPlaceholders(invoice.terms, {
                  paymentDue: formatDate(invoice.dueDate),
                  contactPerson: contactPerson ?? "",
                })}
              </p>
            ) : null}

            {contactPerson ? (
              <p className="mt-6 text-[12px] font-medium text-slate-900">{contactPerson}</p>
            ) : null}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn("tabular-nums")}>{value}</dd>
    </div>
  );
}

/* --- icons --- */
type IconProps = { className?: string };
const ChevronUpIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m6 15 6-6 6 6" />
  </svg>
);
const ChevronDownIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const ZoomInIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4 4" />
    <path d="M11 8v6M8 11h6" />
  </svg>
);
const ZoomOutIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m16.5 16.5 4 4" />
    <path d="M8 11h6" />
  </svg>
);
const DownloadIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M12 4v12" />
    <path d="m7.5 11.5 4.5 4.5 4.5-4.5" />
    <path d="M4 19h16" />
  </svg>
);
