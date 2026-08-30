"use client";

import { useState } from "react";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { countryName } from "@/lib/countries";
import {
  DOCUMENT_STRINGS,
  fillPlaceholders,
  type DocumentLanguage,
} from "@/lib/invoice-document-strings";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------------------------------------------------
 * The live document preview beside the invoice editor.
 *
 * An HTML approximation of the page, not the PDF. It redraws on every keystroke, which a server
 * render could not do, and it exists to answer "does this read right" while typing. The PDF that
 * actually goes to the customer comes from the invoice's own endpoint after saving, and that one
 * is authoritative — this pane deliberately says so rather than implying the two are identical.
 *
 * Two sizes. The thumbnail is the default: it confirms the shape of the page without stealing
 * half the window from the form, which is what an operator is actually typing into. Expanding it
 * is one click for when the wording matters.
 * ------------------------------------------------------------------------ */

type PreviewLine = {
  description: string;
  detail: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  discountAmount: string;
};

function num(value: string) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

const ZOOMS = [0.6, 0.75, 0.9, 1];

export function InvoicePreview({
  companyName,
  number,
  subject,
  issueDate,
  deliveryDate,
  periodStart,
  periodEnd,
  dueDate,
  recipientName,
  addressLine1,
  postalCode,
  city,
  countryCode,
  notes,
  terms,
  lines,
  currency,
  totals,
  taxNote,
  contactPerson,
  language,
  variant = "full",
  onExpand,
  onCollapse,
}: {
  companyName: string;
  number: string | null;
  subject: string;
  issueDate: string;
  deliveryDate: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  dueDate: string;
  recipientName: string | null;
  addressLine1: string;
  postalCode: string;
  city: string;
  countryCode: string;
  notes: string;
  terms: string;
  lines: PreviewLine[];
  currency: string;
  totals: { subtotal: number; discount: number; tax: number; total: number };
  taxNote: string | null;
  contactPerson: string | null;
  language: DocumentLanguage;
  variant?: "full" | "thumbnail";
  onExpand?: () => void;
  onCollapse?: () => void;
}) {
  const [zoom, setZoom] = useState(0.75);
  // The thumbnail is a fixed size — there is nothing to zoom, and a control there would only
  // invite fiddling with something too small to read either way.
  const thumbnail = variant === "thumbnail";
  const scale = thumbnail ? 0.18 : zoom;

  const s = DOCUMENT_STRINGS[language];
  const visible = lines.filter((line) => line.description.trim() !== "");
  const heading =
    subject.trim() || (number ? `${s.headingPrefix} ${number}` : s.headingPrefix);

  // Substituted here so the preview shows the sentence the customer will actually read rather
  // than the token that stands in for it.
  const renderedTerms = fillPlaceholders(terms, {
    paymentDue: formatDate(dueDate),
    contactPerson: contactPerson ?? "",
  });

  const page = (
      /* A4 proportions, scaled. Width is fixed so the layout does not reflow as the pane moves. */
      <div className="origin-top-left" style={{ transform: `scale(${scale})`, width: 794 }}>
        <div className="min-h-[1123px] bg-white p-14 text-[13px] leading-relaxed text-slate-800 shadow-lg">
          <p className="text-right text-lg font-semibold text-slate-900">{companyName}</p>

          <div className="mt-12 flex justify-between gap-10">
            <div>
              <p className="mb-6 border-b border-slate-200 pb-1 text-[10px] text-slate-400">
                {companyName}
              </p>
              {recipientName ? (
                <p className="font-medium text-slate-900">{recipientName}</p>
              ) : (
                <p className="italic text-slate-400">{s.noContact}</p>
              )}
              {addressLine1 ? <p>{addressLine1}</p> : null}
              {postalCode || city ? <p>{[postalCode, city].filter(Boolean).join(" ")}</p> : null}
              {/* An invoice to a foreign address has to name the country; leaving it off was
                  fine only while every recipient happened to be domestic. */}
              {countryCode && countryCode !== "DE" ? (
                <p>{countryName(countryCode, language)}</p>
              ) : null}
            </div>

            <dl className="w-56 shrink-0 space-y-1 text-[11px]">
              <Meta label={s.invoiceNo} value={number ?? "—"} />
              <Meta label={s.date} value={formatDate(issueDate)} />
              <Meta
                label={periodStart ? s.servicePeriod : s.deliveryDate}
                value={
                  periodStart
                    ? `${formatDate(periodStart)} – ${formatDate(periodEnd)}`
                    : formatDate(deliveryDate)
                }
              />
              {contactPerson ? <Meta label={s.yourContact} value={contactPerson} /> : null}
            </dl>
          </div>

          <h1 className="mt-10 text-lg font-bold text-slate-900">{heading}</h1>

          {notes.trim() ? (
            <p className="mt-4 whitespace-pre-wrap">{notes}</p>
          ) : null}

          <table className="mt-8 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-300 text-left">
                <th className="py-1.5 font-semibold">{s.description}</th>
                <th className="w-20 py-1.5 text-right font-semibold">{s.qty}</th>
                <th className="w-24 py-1.5 text-right font-semibold">{s.unitPrice}</th>
                <th className="w-24 py-1.5 text-right font-semibold">{s.lineTotal}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center italic text-slate-400">
                    {s.noItems}
                  </td>
                </tr>
              ) : (
                visible.map((line, index) => (
                  <tr key={index} className="border-b border-slate-100 align-top">
                    <td className="py-2">
                      <span className="text-slate-900">
                        {index + 1}. {line.description}
                      </span>
                      {line.detail.trim() ? (
                        <span className="block whitespace-pre-wrap text-[11px] text-slate-500">
                          {line.detail}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {num(line.quantity)} {line.unit}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(num(line.unitPrice), currency)}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatMoney(
                        num(line.quantity) * num(line.unitPrice) - num(line.discountAmount),
                        currency,
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <div className="mt-4 flex justify-end">
            <dl className="w-64 space-y-1 text-[12px]">
              <Total label={s.totalNet} value={formatMoney(totals.subtotal, currency)} />
              {totals.discount > 0 ? (
                <Total
                  label={s.discount}
                  value={`− ${formatMoney(totals.discount, currency)}`}
                />
              ) : null}
              <Total label={s.vat} value={formatMoney(totals.tax, currency)} />
              <div className="flex justify-between border-t border-slate-300 pt-1.5 text-[13px] font-bold text-slate-900">
                <dt>{s.totalGross}</dt>
                <dd className="tabular-nums">{formatMoney(totals.total, currency)}</dd>
              </div>
            </dl>
          </div>

          {/* The statutory note for whichever treatment is selected. Printing the wrong one is as
              much a defect as printing the wrong number, so it tracks the radio directly. */}
          {taxNote ? (
            <p className="mt-6 rounded border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-700">
              {taxNote}
            </p>
          ) : null}

          {renderedTerms.trim() ? (
            <p className="mt-8 whitespace-pre-wrap text-[12px]">{renderedTerms}</p>
          ) : null}

          {contactPerson ? (
            <p className="mt-6 text-[12px] font-medium text-slate-900">{contactPerson}</p>
          ) : null}
        </div>
      </div>
  );

  if (thumbnail) {
    return (
      <div className="rounded-2xl bg-slate-100 p-3 shadow-sm">
        <div className="relative overflow-hidden rounded-lg bg-white shadow-sm">
          {/* The page is scaled inside a box sized to what it becomes, so the card wraps the
              artwork tightly instead of leaving the transform's original footprint behind. */}
          <div
            aria-hidden
            style={{ width: 794 * 0.18, height: 1123 * 0.18 }}
            className="overflow-hidden"
          >
            {page}
          </div>

          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand preview"
            className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-lg bg-white/90 text-muted shadow-sm transition-colors hover:text-foreground"
          >
            <ExpandIcon className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <select
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          aria-label="Preview zoom"
          className="h-8 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
        >
          {ZOOMS.map((level) => (
            <option key={level} value={level}>
              {Math.round(level * 100)}%
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Zoom out"
          onClick={() => setZoom((z) => ZOOMS[Math.max(0, ZOOMS.indexOf(z) - 1)] ?? z)}
          className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted hover:bg-slate-50"
        >
          −
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={() =>
            setZoom((z) => ZOOMS[Math.min(ZOOMS.length - 1, ZOOMS.indexOf(z) + 1)] ?? z)
          }
          className="grid size-8 place-items-center rounded-lg border border-border bg-card text-muted hover:bg-slate-50"
        >
          +
        </button>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse preview"
          className="ml-auto grid size-8 place-items-center rounded-lg border border-border bg-card text-muted hover:bg-slate-50"
        >
          <CollapseIcon className="size-4" />
        </button>
      </div>

      {page}

      <p className={cn("mt-4 text-xs text-muted", zoom < 1 && "mt-6")}>
        An approximation of the page. The PDF sent to the customer is rendered by the server once
        the invoice is saved, and that is the authoritative one.
      </p>
    </div>
  );
}

type IconProps = { className?: string };

const ExpandIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M14 4h6v6" />
    <path d="M10 20H4v-6" />
    <path d="m20 4-7 7" />
    <path d="m4 20 7-7" />
  </svg>
);

const CollapseIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M20 10h-6V4" />
    <path d="M4 14h6v6" />
    <path d="m14 10 7-7" />
    <path d="m3 21 7-7" />
  </svg>
);

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
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
