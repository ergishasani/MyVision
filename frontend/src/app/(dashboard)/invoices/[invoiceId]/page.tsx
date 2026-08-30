"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { getClient } from "@/lib/api/clients";
import {
  cancelInvoice,
  fetchInvoiceDocument,
  getInvoice,
  listInvoicePayments,
  listInvoices,
  markInvoicePaid,
  markInvoiceSent,
  recordInvoicePayment,
  replaceInvoiceTags,
  type InvoiceFormat,
  type InvoicePayment,
} from "@/lib/api/invoices";
import { listInvoiceAttachments, type InvoiceAttachment } from "@/lib/api/invoices";
import type { Client, Invoice } from "@/types/api";
import { StatusPill } from "@/components/layout/page-shell";
import { InvoiceDocument } from "@/components/invoices/invoice-document";
import { getSession } from "@/lib/auth/session";
import { documentSenderName } from "@/lib/document-sender";
import { daysOverdue, formatDate, formatMoney, humanizeStatus } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Statuses that still owe money, matching the list and the dashboard. */
const OPEN_STATUSES = new Set(["sent", "unpaid", "partially_paid", "overdue"]);

const FORMATS: Array<{ value: InvoiceFormat; label: string; hint: string }> = [
  { value: "pdf", label: "PDF", hint: "The document as the customer sees it" },
  { value: "xrechnung", label: "XRechnung (XML)", hint: "For public-sector e-invoicing" },
  { value: "zugferd", label: "ZUGFeRD (PDF/A-3)", hint: "PDF with the XML embedded" },
];

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const id = params.invoiceId;

  const [loaded, setLoaded] = useState<{ id: string; invoice: Invoice } | null>(null);
  const [failed, setFailed] = useState<{ id: string; message: string } | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>([]);
  const [siblings, setSiblings] = useState<Invoice[]>([]);

  const [busy, setBusy] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [addingTag, setAddingTag] = useState(false);
  const [menu, setMenu] = useState<"download" | "more" | null>(null);
  const [paying, setPaying] = useState(false);

  const invoice = loaded?.id === id ? loaded.invoice : null;
  const error = failed?.id === id ? failed.message : null;
  const session = getSession();

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getInvoice(id),
      listInvoicePayments(id).catch(() => []),
      listInvoiceAttachments(id).catch(() => []),
      listInvoices().catch(() => []),
    ])
      .then(async ([found, paid, files, all]) => {
        if (cancelled) return;
        setLoaded({ id, invoice: found });
        setPayments(paid);
        setAttachments(files);
        setSiblings(all);
        try {
          const contact = await getClient(found.clientId);
          if (!cancelled) setClient(contact);
        } catch {
          // The invoice stands on its own if the contact cannot be read.
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailed({
          id,
          message: err instanceof ApiError ? err.message : "Failed to load this invoice",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const position = useMemo(() => {
    const index = siblings.findIndex((entry) => entry.id === id);
    return {
      previous: index > 0 ? siblings[index - 1] : null,
      next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
      index,
    };
  }, [siblings, id]);

  async function act(action: (id: string) => Promise<Invoice>, failure: string) {
    setMenu(null);
    setBusy(true);
    try {
      const saved = await action(id);
      setLoaded({ id, invoice: saved });
      setPayments(await listInvoicePayments(id).catch(() => payments));
    } catch (err) {
      setFailed({ id, message: err instanceof ApiError ? err.message : failure });
    } finally {
      setBusy(false);
    }
  }

  async function saveTags(next: string[]) {
    setAddingTag(false);
    setTagDraft("");
    try {
      const saved = await replaceInvoiceTags(id, next);
      setLoaded({ id, invoice: saved });
    } catch (err) {
      setFailed({ id, message: err instanceof ApiError ? err.message : "Could not save the tags" });
    }
  }

  async function download(format: InvoiceFormat) {
    setMenu(null);
    try {
      const url = await fetchInvoiceDocument(id, format);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${invoice?.invoiceNumber ?? "invoice"}.${
        format === "xrechnung" ? "xml" : "pdf"
      }`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (err) {
      setFailed({ id, message: err instanceof ApiError ? err.message : "Could not download" });
    }
  }

  if (!invoice) {
    return (
      <div className="rounded-xl border border-border bg-card p-16 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">
          {error ? "This invoice could not be loaded" : "Loading invoice…"}
        </p>
        {error ? <p className="mt-1 text-sm text-muted">{error}</p> : null}
        <Link
          href="/invoices"
          className="mt-4 inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-slate-50"
        >
          Back to invoices
        </Link>
      </div>
    );
  }

  const late = daysOverdue(invoice.dueDate);
  const isOverdue = OPEN_STATUSES.has(invoice.status) && late !== null && late > 0;
  const status = isOverdue ? "overdue" : invoice.status;
  const settled = invoice.status === "paid";
  const isCreditNote = invoice.type === "credit_note";

  return (
    // Exactly the height the shell gives it, so the two columns scroll on their own and the
    // page behind them never does. The subtraction covers the shell's own vertical padding.
    <div
      className="flex h-[calc(100dvh-56px)] flex-col gap-5"
      onClick={() => setMenu(null)}
    >
      <header className="flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-3">
          <Link
            href="/invoices"
            aria-label="Back to invoices"
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {isCreditNote ? "Credit note" : "Invoice"} no. {invoice.invoiceNumber}
            </h1>
            {invoice.sourceQuoteId ? (
              <Link
                href={`/quotes/${invoice.sourceQuoteId}`}
                className="mt-0.5 inline-block text-sm text-primary hover:underline"
              >
                Show linked documents
              </Link>
            ) : (
              <p className="mt-0.5 text-sm text-muted">
                {invoice.subject || "No subject"}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMenu(menu === "more" ? null : "more")}
              aria-expanded={menu === "more"}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
            >
              More
              <ChevronDownIcon className="size-4 text-muted" />
            </button>
            {menu === "more" ? (
              <div
                role="menu"
                className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
              >
                {/* Only transitions the server accepts. Anything else would be a menu of
                    guaranteed errors. */}
                {invoice.status === "draft" ? (
                  <MenuButton
                    onClick={() => act(markInvoiceSent, "Could not mark this invoice as sent")}
                  >
                    Mark as sent
                  </MenuButton>
                ) : null}
                {!settled && invoice.status !== "cancelled" ? (
                  <>
                    <MenuButton onClick={() => { setMenu(null); setPaying(true); }}>
                      Record a payment
                    </MenuButton>
                    <MenuButton
                      onClick={() => act(markInvoicePaid, "Could not mark this invoice as paid")}
                    >
                      Mark as fully paid
                    </MenuButton>
                  </>
                ) : null}
                {invoice.status !== "cancelled" ? (
                  <MenuButton
                    tone="danger"
                    onClick={() => act(cancelInvoice, "Could not cancel this invoice")}
                  >
                    Cancel invoice
                  </MenuButton>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="relative" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMenu(menu === "download" ? null : "download")}
              aria-expanded={menu === "download"}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
            >
              <DownloadIcon className="size-4" />
              Download
            </button>
            {menu === "download" ? (
              <div
                role="menu"
                className="absolute right-0 top-11 z-30 w-64 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
              >
                {FORMATS.map((format) => (
                  <button
                    key={format.value}
                    type="button"
                    onClick={() => download(format.value)}
                    className="block w-full px-4 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="block text-sm text-foreground">{format.label}</span>
                    <span className="block text-xs text-muted">{format.hint}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {/* Deliberately not "Send document": there is no endpoint that emails a customer, and
              inventing one would mean this button silently contacts them. Marking it sent records
              the fact, which is what the rest of the system reads. */}
          <button
            type="button"
            disabled={busy || invoice.status !== "draft"}
            onClick={() => act(markInvoiceSent, "Could not mark this invoice as sent")}
            title={
              invoice.status === "draft"
                ? "Records that the invoice has gone out"
                : "Already issued"
            }
            className="inline-flex h-10 items-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Mark as sent
          </button>
        </div>
      </header>

      {error ? (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => setFailed(null)}
            className="text-sm font-medium text-red-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* --- the document ------------------------------------------------ */}
        <InvoiceDocument
          invoice={invoice}
          companyName={documentSenderName(
            session?.company,
            session?.user,
            invoice.showCompanyName,
          )}
          contactPerson={session?.user.fullName ?? null}
          fallbackRecipient={
            client
              ? {
                  name: client.name,
                  addressLine1: client.addressLine1,
                  postalCode: client.postalCode,
                  city: client.city,
                  countryCode: client.countryCode,
                }
              : null
          }
          taxNote={taxNoteFor(invoice.taxScheme, invoice.language)}
          onDownload={() => download("pdf")}
        />

        {/* --- the sidebar -------------------------------------------------- */}
        <aside className="min-h-0 space-y-4 overflow-y-auto pb-2">
          <Card>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{invoice.invoiceNumber}</span>
              <span className="flex items-center gap-1">
                <NavArrow
                  href={position.previous ? `/invoices/${position.previous.id}` : null}
                  label="Previous invoice"
                >
                  <ChevronLeftIcon className="size-4" />
                </NavArrow>
                <NavArrow
                  href={position.next ? `/invoices/${position.next.id}` : null}
                  label="Next invoice"
                >
                  <ChevronRightIcon className="size-4" />
                </NavArrow>
              </span>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/clients/${invoice.clientId}`}
                  className="flex items-center gap-1.5 font-medium text-foreground hover:text-primary hover:underline"
                >
                  <span className="truncate">
                    {invoice.recipientName ?? client?.name ?? "Unknown contact"}
                  </span>
                  <LinkIcon className="size-3.5 shrink-0 text-muted" />
                </Link>
                <p className="mt-1 text-sm text-muted">{formatDate(invoice.issueDate)}</p>
              </div>
              <StatusPill status={humanizeStatus(status)} />
            </div>

            <div className="mt-8">
              <div className="flex items-end justify-between gap-3">
                <p className="text-sm text-muted">
                  Amount <span className="text-xs">(gross)</span>
                </p>
                <p
                  className={cn(
                    "text-3xl font-semibold leading-none tabular-nums",
                    isCreditNote ? "text-red-600" : "text-foreground",
                  )}
                >
                  {formatMoney(
                    isCreditNote ? -Number(invoice.totalAmount) : invoice.totalAmount,
                    invoice.currency,
                  )}
                </p>
              </div>
              {Number(invoice.balanceDue) > 0 && !settled ? (
                <p className="mt-1 text-sm text-muted">
                  {formatMoney(invoice.balanceDue, invoice.currency)} still outstanding
                </p>
              ) : null}
            </div>
          </Card>

          <Card>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">Invoice details</h2>
              <button
                type="button"
                aria-label="Open the document"
                onClick={() => download("pdf")}
                className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-slate-100 hover:text-foreground"
              >
                <DocumentIcon className="size-4" />
              </button>
            </div>

            <Row
              label="Due"
              value={formatDate(invoice.dueDate)}
              // Struck through once settled: the date is still a record, but no longer something
              // to act on.
              struck={settled}
              tone={isOverdue ? "danger" : undefined}
            />
            {isOverdue && late !== null ? (
              <Row label="Overdue by" value={`${late} day${late === 1 ? "" : "s"}`} tone="danger" />
            ) : null}

            <Row
              label="Payment terms"
              value={
                invoice.dueDate
                  ? `${formatDate(invoice.dueDate)} (${termDays(invoice.issueDate, invoice.dueDate)} days)`
                  : "—"
              }
            />

            <div className="flex items-start justify-between gap-3 border-b border-border py-3 text-sm last:border-0">
              <span className="shrink-0 text-muted">Tags</span>
              <div className="flex flex-wrap justify-end gap-1.5">
                {invoice.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary"
                  >
                    {tag}
                    <button
                      type="button"
                      aria-label={`Remove tag ${tag}`}
                      onClick={() => saveTags(invoice.tags.filter((entry) => entry !== tag))}
                      className="text-primary/70 hover:text-primary"
                    >
                      ×
                    </button>
                  </span>
                ))}

                {addingTag ? (
                  <input
                    value={tagDraft}
                    autoFocus
                    onChange={(event) => setTagDraft(event.target.value)}
                    onBlur={(event) => {
                      // Read from the element, not from state: this handler may have been created
                      // before the final keystroke was applied, and would then save a stale value.
                      const entered = event.currentTarget.value.trim();
                      if (entered) {
                        saveTags([...invoice.tags, entered]);
                      } else {
                        setAddingTag(false);
                        setTagDraft("");
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.currentTarget.blur();
                      } else if (event.key === "Escape") {
                        setAddingTag(false);
                        setTagDraft("");
                      }
                    }}
                    placeholder="Tag name"
                    className="h-6 w-28 rounded-md border border-border bg-card px-1.5 text-xs outline-none focus:border-primary"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingTag(true)}
                    className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-muted transition-colors hover:bg-slate-200 hover:text-foreground"
                  >
                    Add tags
                  </button>
                )}
              </div>
            </div>

            <Row label="Invoice date" value={formatDate(invoice.issueDate)} />
            <Row label="Sent on" value={invoice.sentAt ? formatDate(invoice.sentAt) : "—"} />

            {/* Locked once issued. Not a separate flag: the update endpoint already refuses to
                edit anything past draft, so the date it left draft is the date it froze. */}
            <Row
              label="Recorded"
              value={invoice.sentAt ? formatDate(invoice.sentAt) : "Not yet"}
              icon={invoice.sentAt ? <LockIcon className="size-3.5" /> : undefined}
            />

            {/* No DATEV export exists. Reported as such, with no link, rather than offering an
                action that would go nowhere. */}
            <div className="flex items-start justify-between gap-3 py-3 text-sm">
              <span className="shrink-0 text-muted">DATEV export history</span>
              <span className="text-right">
                <span className="block text-muted">Not exported</span>
                <span className="block text-xs text-muted/70">Export is not built yet</span>
              </span>
            </div>
          </Card>

          {payments.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Payments ({payments.length})
              </h2>
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between border-b border-border py-2 text-sm last:border-0"
                >
                  <span className="text-muted">
                    {formatDate(payment.paidAt)}
                    <span className="ml-1.5 text-xs">{humanizeStatus(payment.method)}</span>
                  </span>
                  <span className="tabular-nums text-foreground">
                    {formatMoney(payment.amount, payment.currency)}
                  </span>
                </div>
              ))}
            </Card>
          ) : null}

          {attachments.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Attachments ({attachments.length})
              </h2>
              <ul className="space-y-1.5">
                {attachments.map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {file.fileName}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <p className="px-1 text-xs text-muted">
            Emailing the document to the customer is not wired up yet — download it and send it
            yourself, then mark the invoice as sent.
          </p>
        </aside>
      </div>

      {paying ? (
        <PaymentDialog
          maxAmount={Number(invoice.balanceDue)}
          currency={invoice.currency}
          onClose={() => setPaying(false)}
          onRecord={async (amount) => {
            setPaying(false);
            setBusy(true);
            try {
              await recordInvoicePayment(id, { amount });
              const [fresh, paid] = await Promise.all([getInvoice(id), listInvoicePayments(id)]);
              setLoaded({ id, invoice: fresh });
              setPayments(paid);
            } catch (err) {
              setFailed({
                id,
                message: err instanceof ApiError ? err.message : "Could not record the payment",
              });
            } finally {
              setBusy(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}

/** Whole days between issue and due, which is how a payment term is spoken about. */
function termDays(issue: string, due: string) {
  const from = new Date(`${issue}T00:00:00Z`).getTime();
  const to = new Date(`${due}T00:00:00Z`).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.round((to - from) / 86_400_000);
}

/* --- pieces --------------------------------------------------------------- */

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5 shadow-sm">{children}</div>;
}

function Row({
  label,
  value,
  struck,
  tone,
  icon,
  muted,
}: {
  label: string;
  value: string;
  struck?: boolean;
  tone?: "danger";
  icon?: React.ReactNode;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border py-3 text-sm last:border-0">
      <span className="shrink-0 text-muted">{label}</span>
      <span
        className={cn(
          "flex items-center gap-1.5 text-right tabular-nums",
          struck && "line-through",
          tone === "danger"
            ? "font-medium text-red-600"
            : struck || muted
              ? "text-muted"
              : "text-foreground",
        )}
      >
        {icon}
        {value}
      </span>
    </div>
  );
}

/**
 * The statutory note a saved invoice carries.
 *
 * <p>Kept beside the document rather than stored on it: the wording is a property of the tax
 * treatment, and printing an out-of-date phrasing on an old invoice would be worse than deriving
 * it from the scheme the invoice was issued under.
 */
function taxNoteFor(scheme: string, language: string) {
  const german = language === "de";
  switch (scheme) {
    case "domestic_exempt":
      return german
        ? "Steuerfreie Leistung nach § 4 UStG."
        : "Exempt from VAT under § 4 UStG.";
    case "reverse_charge_13b":
      return german
        ? "Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG)."
        : "Reverse charge — the recipient is liable for the VAT (§ 13b UStG).";
    case "eu_b2b":
      return german
        ? "Steuerfreie innergemeinschaftliche Lieferung (§ 4 Nr. 1b i.V.m. § 6a UStG)."
        : "Zero-rated intra-community supply (§ 4 Nr. 1b in conjunction with § 6a UStG).";
    case "export_non_eu":
      return german
        ? "Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG)."
        : "Zero-rated export (§ 4 Nr. 1a in conjunction with § 6 UStG).";
    default:
      return null;
  }
}

function NavArrow({
  href,
  label,
  children,
}: {
  href: string | null;
  label: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <span
        aria-label={`${label} (none)`}
        className="grid size-7 cursor-not-allowed place-items-center rounded-md text-muted opacity-30"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className="grid size-7 place-items-center rounded-md text-muted transition-colors hover:bg-slate-100 hover:text-foreground"
    >
      {children}
    </Link>
  );
}

function MenuButton({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full px-4 py-2 text-left text-sm hover:bg-slate-50",
        tone === "danger" ? "text-red-600 hover:bg-red-50" : "text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Records part or all of what is still owed. */
function PaymentDialog({
  maxAmount,
  currency,
  onClose,
  onRecord,
}: {
  maxAmount: number;
  currency: string;
  onClose: () => void;
  onRecord: (amount: number) => void;
}) {
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const parsed = Number(amount.replace(",", "."));
  // The server refuses more than the balance; catching it here saves a round trip and explains
  // the limit rather than reporting it after the fact.
  const tooMuch = Number.isFinite(parsed) && parsed > maxAmount;
  const valid = Number.isFinite(parsed) && parsed > 0 && !tooMuch;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-slate-900/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-foreground">Record a payment</h2>
        <p className="mt-1 text-sm text-muted">
          {formatMoney(maxAmount, currency)} is still outstanding.
        </p>

        <label className="mt-4 block">
          <span className="mb-1 block text-sm text-foreground">Amount</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="decimal"
            autoFocus
            className="h-10 w-full rounded-lg border border-border bg-card px-3 text-right text-sm outline-none focus:border-primary"
          />
        </label>
        {tooMuch ? (
          <p className="mt-1 text-xs text-red-600">
            More than the outstanding balance. Record at most {formatMoney(maxAmount, currency)}.
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg px-4 text-sm font-medium text-foreground hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!valid}
            onClick={() => onRecord(parsed)}
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-50"
          >
            Record
          </button>
        </div>
      </div>
    </div>
  );
}

/* --- icons --- */
type IconProps = { className?: string };
const ChevronLeftIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m14 6-6 6 6 6" />
  </svg>
);
const ChevronRightIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m10 6 6 6-6 6" />
  </svg>
);
const ChevronDownIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const DownloadIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M12 4v12" />
    <path d="m7.5 11.5 4.5 4.5 4.5-4.5" />
    <path d="M4 19h16" />
  </svg>
);
const DocumentIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M6 3h7l5 5v13H6Z" />
    <path d="M13 3v5h5" />
  </svg>
);
const LockIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);
const LinkIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M10 13.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5L11 7.5" />
    <path d="M14 10.5a3.5 3.5 0 0 0-5 0L6.5 13a3.5 3.5 0 0 0 5 5l1.5-1.5" />
  </svg>
);
