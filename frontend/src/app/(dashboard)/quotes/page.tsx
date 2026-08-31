"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { listClients } from "@/lib/api/dashboard";
import {
  acceptQuote,
  convertQuoteToInvoice,
  listQuotes,
  rejectQuote,
  sendQuote,
} from "@/lib/api/quotes";
import type { Client, Quote, QuoteStatus } from "@/types/api";
import { StatusPill } from "@/components/layout/page-shell";
import { formatDate, formatMoney, humanizeStatus } from "@/lib/utils/format";
import { useT } from "@/components/providers/locale-provider";
import { format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";

/** Filter keys, deliberately not the visible labels -- those change with the language. */
const TABS = ["all", "draft", "open", "accepted", "rejected", "expired", "converted"] as const;
type Tab = (typeof TABS)[number];

const PAGE_SIZES = [25, 50, 100];

/** "Open" is the operator's word for a quote that is out with the customer and still undecided. */
function matchesTab(quote: Quote, tab: Tab) {
  switch (tab) {
    case "all":
      return true;
    case "draft":
      return quote.status === "draft";
    case "open":
      // Lapsed offers are deliberately excluded, so this tab agrees with the "out with customers"
      // figure above it. A quote past its validity date is not still in play, and listing it as
      // Open while the row itself reads Expired is just a contradiction on screen.
      return quote.status === "sent" && !isLapsed(quote);
    case "accepted":
      return quote.status === "accepted";
    case "rejected":
      return quote.status === "rejected";
    case "expired":
      return quote.status === "expired" || isLapsed(quote);
    case "converted":
      return quote.status === "converted";
    default:
      return true;
  }
}

/**
 * A sent quote whose validity date has passed.
 *
 * <p>Nothing sweeps quotes to `expired` on a timer, so a quote can sit as `sent` long after the
 * date it promised to honour. Deriving it here means the list stops offering a price the business
 * is no longer standing behind.
 */
function isLapsed(quote: Quote) {
  if (quote.status !== "sent" || !quote.validUntil) return false;
  const until = new Date(quote.validUntil);
  if (Number.isNaN(until.getTime())) return false;
  return until.getTime() < Date.now();
}

function effectiveStatus(quote: Quote): QuoteStatus {
  return isLapsed(quote) ? "expired" : quote.status;
}

/**
 * What the quote is for.
 *
 * <p>There is no subject field on a quote, so the first line's description stands in — it is what
 * the customer sees at the top of the document anyway. Falls back to the number so the column is
 * never blank.
 */
function subjectOf(quote: Quote) {
  const first = quote.items?.[0]?.description?.trim();
  return first && first.length > 0 ? first : `Quote ${quote.quoteNumber}`;
}

/** Net is what the customer is quoted before VAT: the line total less any document discount. */
function netOf(quote: Quote) {
  return Number(quote.subtotalAmount) - Number(quote.discountAmount);
}

type Filters = {
  clientId: string;
  from: string;
  to: string;
  minNet: string;
  maxNet: string;
};

const NO_FILTERS: Filters = { clientId: "", from: "", to: "", minNet: "", maxNet: "" };

function activeFilterCount(filters: Filters) {
  return Object.values(filters).filter((value) => value.trim() !== "").length;
}

/**
 * Whether a quote survives the filter panel.
 *
 * <p>Dates are compared as strings on purpose: `issueDate` is an ISO `YYYY-MM-DD`, and that format
 * sorts lexicographically exactly as it does chronologically. Parsing to Date objects here would
 * drag the browser's timezone into a comparison that is about calendar days, and an offer issued
 * late on the 31st would start dropping out of a range that includes the 31st.
 */
function matchesFilters(quote: Quote, filters: Filters) {
  if (filters.clientId && quote.clientId !== filters.clientId) return false;
  if (filters.from && quote.issueDate < filters.from) return false;
  if (filters.to && quote.issueDate > filters.to) return false;

  const net = netOf(quote);
  const min = Number(filters.minNet);
  const max = Number(filters.maxNet);
  if (filters.minNet && Number.isFinite(min) && net < min) return false;
  if (filters.maxNet && Number.isFinite(max) && net > max) return false;
  return true;
}

/* --- export --------------------------------------------------------------- */

/** Wraps a field only when it has to be, and doubles any quotes inside it. */
function csvCell(value: string) {
  return /[;"\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** German decimal comma, so the column arrives in Excel as a number rather than as text. */
function csvNumber(value: number) {
  return value.toFixed(2).replace(".", ",");
}

function csvDate(iso: string | null) {
  if (!iso) return "";
  const [year, month, day] = iso.split("-");
  return year && month && day ? `${day}.${month}.${year}` : iso;
}

const csvColumns = (t: Dictionary["quotes"]) => [
  t.csv.status,
  t.csv.number,
  t.csv.customer,
  t.csv.subject,
  t.csv.issueDate,
  t.csv.validUntil,
  t.csv.net,
  t.csv.vat,
  t.csv.gross,
  t.csv.currency,
];

/**
 * Downloads the offers currently on screen as a spreadsheet.
 *
 * <p>Semicolon-separated with a byte-order mark: a German Excel opens `,`-separated files by
 * splitting on the decimal comma instead, which turns every amount into two columns, and drops
 * the umlauts in customer names without the BOM.
 */
function exportOffers(
  quotes: Quote[],
  clientName: (id: string) => string,
  columns: string[],
) {
  const rows = quotes.map((quote) =>
    [
      humanizeStatus(effectiveStatus(quote)),
      quote.quoteNumber,
      clientName(quote.clientId),
      subjectOf(quote),
      csvDate(quote.issueDate),
      csvDate(quote.validUntil),
      csvNumber(netOf(quote)),
      csvNumber(Number(quote.taxAmount)),
      csvNumber(Number(quote.totalAmount)),
      quote.currency,
    ]
      .map(csvCell)
      .join(";"),
  );

  const csv = "\ufeff" + [columns.join(";"), ...rows].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `offers-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  // Released on the next tick; revoking synchronously can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export default function QuotesPage() {
  const t = useT();
  const c = t.quotes;
  const router = useRouter();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  // The open row menu, with the anchor it hangs from. Held here because it renders in a portal.
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listQuotes(), listClients()])
      .then(([quoteList, clientList]) => {
        if (cancelled) return;
        setQuotes(quoteList);
        setClients(clientList);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : c.loadError);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // The dictionary is only read for the failure message; re-running on a language switch
    // would refetch every offer for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientName = useMemo(() => {
    const byId = new Map(clients.map((client) => [client.id, client.name]));
    return (id: string) => byId.get(id) ?? c.unknownContact;
  }, [clients, c.unknownContact]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return quotes
      .filter((quote) => matchesTab(quote, tab))
      .filter((quote) => matchesFilters(quote, filters))
      .filter((quote) =>
        !needle
          ? true
          : [quote.quoteNumber, clientName(quote.clientId), subjectOf(quote)]
              .some((field) => field.toLowerCase().includes(needle)),
      );
  }, [quotes, tab, query, filters, clientName]);

  // Counted against the filtered set, not the whole list. A tab reading 12 that shows 3 rows
  // because a filter is on is just a number arguing with the table underneath it.
  const counts = useMemo(() => {
    const eligible = quotes.filter((quote) => matchesFilters(quote, filters));
    const result = {} as Record<Tab, number>;
    for (const label of TABS) {
      result[label] = eligible.filter((quote) => matchesTab(quote, label)).length;
    }
    return result;
  }, [quotes, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  const firstRow = filtered.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastRow = Math.min(current * pageSize, filtered.length);

  const filterCount = activeFilterCount(filters);
  const currency = quotes[0]?.currency ?? "EUR";
  // Only quotes still in play. A rejected or converted one is not money that might still land.
  const openValue = useMemo(
    () =>
      quotes
        .filter((quote) => quote.status === "sent" && !isLapsed(quote))
        .reduce((sum, quote) => sum + netOf(quote), 0),
    [quotes],
  );

  /** Runs one lifecycle action and swaps the returned quote into the list. */
  async function act(quote: Quote, action: (id: string) => Promise<Quote>, failure: string) {
    setMenu(null);
    setBusy(quote.id);
    try {
      const saved = await action(quote.id);
      setQuotes((list) => list.map((q) => (q.id === saved.id ? saved : q)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
    } finally {
      setBusy(null);
    }
  }

  async function convert(quote: Quote) {
    setMenu(null);
    setBusy(quote.id);
    try {
      const invoice = await convertQuoteToInvoice(quote.id);
      // Straight to the invoice that was just created: that is the thing the operator now works
      // on, and it is the only place the new number is visible.
      router.push(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : c.convertError);
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6" onClick={() => setMenu(null)}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{c.title}</h1>
          {!loading ? (
            <p className="mt-1 text-sm font-medium text-foreground">
              {openValue > 0
                ? format(c.outWithCustomers, {
                    amount: formatMoney(openValue, currency),
                  })
                : format(quotes.length === 1 ? c.countOne : c.countOther, {
                    count: quotes.length,
                  })}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted">
            {c.description}
          </p>
        </div>

        <Link
          href="/quotes/new"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-blue-700"
        >
          <PlusIcon className="size-4" />
          {c.create}
        </Link>
      </header>

      {error ? (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div>
            <p className="text-sm font-medium text-red-700">{c.errorHeading}</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-sm font-medium text-red-700 hover:underline"
          >
            {c.dismiss}
          </button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            {TABS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setTab(name);
                  setPage(1);
                }}
                aria-pressed={tab === name}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  tab === name
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted hover:bg-slate-100 hover:text-foreground",
                )}
              >
                {c.tabs[name]}
                <span className="ml-1.5 text-xs opacity-70">{counts[name]}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <span className="sr-only">{c.searchLabel}</span>
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={c.searchPlaceholder}
                className="h-9 w-56 rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <div className="relative" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                aria-expanded={filterOpen}
                onClick={() => setFilterOpen((open) => !open)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
                  filterCount > 0
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted hover:bg-slate-50 hover:text-foreground",
                )}
              >
                <FilterIcon className="size-4" />
                Filter
                {filterCount > 0 ? (
                  <span className="rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                    {filterCount}
                  </span>
                ) : null}
              </button>

              {filterOpen ? (
                <FilterPanel
                  filters={filters}
                  clients={clients}
                  onChange={(next) => {
                    setFilters(next);
                    setPage(1);
                  }}
                  onClose={() => setFilterOpen(false)}
                />
              ) : null}
            </div>

            <button
              type="button"
              disabled={filtered.length === 0}
              onClick={() => exportOffers(filtered, clientName, csvColumns(c))}
              title={
                filtered.length === 0
                  ? c.nothingToExport
                  : format(c.exportHint, { count: filtered.length })
              }
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted transition-colors hover:bg-slate-50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExportIcon className="size-4" />
              {c.export}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/70">
                <Th className="w-44">{c.colStatus}</Th>
                <Th className="w-32">No.</Th>
                <Th>{c.colCustomer}</Th>
                <Th className="w-32">{c.colDate}</Th>
                <Th className="w-36 text-right">{c.colAmountNet}</Th>
                <Th className="w-16 text-right">{c.colActions}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="mx-auto max-w-sm text-center">
                      <div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100">
                        <DocumentIcon className="size-5 text-muted" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {loading
                          ? c.loadingTitle
                          : quotes.length === 0
                            ? c.emptyTitle
                            : c.filteredTitle}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {loading
                          ? c.loadingHint
                          : quotes.length === 0
                            ? c.emptyHint
                            : filterCount > 0
                              ? c.filteredHintFilters
                              : c.filteredHintSearch}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((quote) => {
                  const status = effectiveStatus(quote);
                  return (
                    <tr
                      key={quote.id}
                      className={cn(
                        "border-b border-border last:border-0 hover:bg-slate-50/70",
                        busy === quote.id && "opacity-50",
                      )}
                    >
                      <td className="px-4 py-3">
                        <StatusPill status={humanizeStatus(status)} />
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/quotes/${quote.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {quote.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/clients/${quote.clientId}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {clientName(quote.clientId)}
                        </Link>
                        <span className="block truncate text-xs text-muted">
                          {subjectOf(quote)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatDate(quote.issueDate)}
                        {status === "expired" && quote.validUntil ? (
                          <span className="block text-xs text-amber-600">
                            lapsed {formatDate(quote.validUntil)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {formatMoney(netOf(quote), quote.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          aria-label={`Options for ${quote.quoteNumber}`}
                          aria-expanded={menu?.id === quote.id}
                          disabled={busy === quote.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (menu?.id === quote.id) {
                              setMenu(null);
                              return;
                            }
                            // Positioned from the button's own box, because the menu renders in a
                            // portal on document.body, outside this scrolling table.
                            const box = event.currentTarget.getBoundingClientRect();
                            setMenu({
                              id: quote.id,
                              top: box.bottom + 6,
                              right: window.innerWidth - box.right,
                            });
                          }}
                          className="rounded-md p-1.5 text-muted transition-colors hover:bg-slate-200 hover:text-foreground disabled:opacity-40"
                        >
                          <DotsIcon className="size-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              aria-label={c.rowsPerPage}
              className="h-8 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted">
              {filtered.length === 0
                ? t.table.noEntries
                : `Showing ${firstRow} – ${lastRow} of ${filtered.length} entries`}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <PageBtn label={c.first} disabled={current === 1} onClick={() => setPage(1)}>«</PageBtn>
            <PageBtn label={t.table.previous} disabled={current === 1} onClick={() => setPage(current - 1)}>‹</PageBtn>
            <span className="px-2 text-sm text-muted">
              {current} / {pageCount}
            </span>
            <PageBtn label={t.table.next} disabled={current === pageCount} onClick={() => setPage(current + 1)}>›</PageBtn>
            <PageBtn label={c.last} disabled={current === pageCount} onClick={() => setPage(pageCount)}>»</PageBtn>
          </div>
        </div>
      </section>

      {/* On document.body so the horizontally scrolling table cannot clip it. */}
      {menu
        ? createPortal(
            (() => {
              const quote = quotes.find((q) => q.id === menu.id);
              if (!quote) return null;
              const status = quote.status;
              return (
                <div
                  role="menu"
                  onClick={(event) => event.stopPropagation()}
                  style={{ top: menu.top, right: menu.right }}
                  className="fixed z-50 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 text-left shadow-lg"
                >
                  <MenuLink href={`/quotes/${quote.id}`}>{c.view}</MenuLink>
                  {status === "draft" ? (
                    <MenuLink href={`/quotes/${quote.id}/edit`}>{c.edit}</MenuLink>
                  ) : null}

                  {/* Only the transitions the server will actually accept are offered. Showing
                      the rest would just be a menu of guaranteed errors. */}
                  {status === "draft" ? (
                    <MenuButton
                      onClick={() => act(quote, sendQuote, c.markSentError)}
                    >
                      {c.markSent}
                    </MenuButton>
                  ) : null}
                  {status === "sent" ? (
                    <>
                      <MenuButton
                        onClick={() => act(quote, acceptQuote, c.acceptError)}
                      >
                        {c.recordAccepted}
                      </MenuButton>
                      <MenuButton
                        tone="danger"
                        onClick={() => act(quote, rejectQuote, c.rejectError)}
                      >
                        {c.recordRejected}
                      </MenuButton>
                    </>
                  ) : null}
                  {status === "accepted" ? (
                    <MenuButton onClick={() => convert(quote)}>{c.convertToInvoice}</MenuButton>
                  ) : null}
                </div>
              );
            })(),
            document.body,
          )
        : null}
    </div>
  );
}

/**
 * The filter popover.
 *
 * <p>Applies as you type rather than behind an "Apply" button: the list is already filtered
 * client-side, so there is nothing to wait for and an extra confirmation step would only put a
 * click between the operator and the answer.
 */
function FilterPanel({
  filters,
  clients,
  onChange,
  onClose,
}: {
  filters: Filters;
  clients: Client[];
  onChange: (filters: Filters) => void;
  onClose: () => void;
}) {
  const c = useT().quotes;
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div
      role="dialog"
      aria-label={c.filterAria}
      className="absolute right-0 top-11 z-40 w-80 rounded-xl border border-border bg-card p-4 shadow-lg"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{c.filterHeading}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={c.closeFilters}
          className="rounded-md p-1 text-muted hover:bg-slate-100 hover:text-foreground"
        >
          <CloseIcon className="size-4" />
        </button>
      </div>

      <Field label={c.filterCustomer}>
        <select
          value={filters.clientId}
          onChange={(event) => set({ clientId: event.target.value })}
          className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
        >
          <option value="">{c.allCustomers}</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label={c.issuedBetween}>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => set({ from: event.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
          />
          <span className="text-sm text-muted">–</span>
          <input
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => set({ to: event.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </Field>

      <Field label={c.netAmount}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            placeholder={c.min}
            value={filters.minNet}
            onChange={(event) => set({ minNet: event.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
          />
          <span className="text-sm text-muted">–</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder={c.max}
            value={filters.maxNet}
            onChange={(event) => set({ maxNet: event.target.value })}
            className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
          />
        </div>
      </Field>

      <div className="mt-4 flex justify-between border-t border-border pt-3">
        <button
          type="button"
          onClick={() => onChange(NO_FILTERS)}
          className="text-sm font-medium text-muted hover:text-foreground"
        >
          {c.clearAll}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-sm font-medium text-primary hover:underline"
        >
          {c.done}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-3 block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted",
        className,
      )}
    >
      {children}
    </th>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block px-4 py-2 text-sm text-foreground hover:bg-slate-50">
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

function PageBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* --- icons --- */
type IconProps = { className?: string };
function icon(path: React.ReactNode) {
  return function Icon({ className }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
        {path}
      </svg>
    );
  };
}
const PlusIcon = icon(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
const SearchIcon = icon(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>);
const DotsIcon = icon(<><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></>);
const FilterIcon = icon(<path d="M3 5h18l-7 8v6l-4 2v-8Z" />);
const ExportIcon = icon(<><path d="M12 16V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></>);
const CloseIcon = icon(<><path d="m6 6 12 12" /><path d="m18 6-12 12" /></>);
const DocumentIcon = icon(<><path d="M6 3h7l5 5v13H6Z" /><path d="M13 3v5h5" /><path d="M9 13h6M9 17h4" /></>);
