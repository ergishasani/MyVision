"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getDashboardActivity, getDashboardOverview } from "@/lib/api/dashboard";
import type {
  ActivityEntry,
  DashboardActivity,
  DashboardOverview,
  DashboardTopProduct,
  ReceivablesBucket,
} from "@/types/api";
import { DONUT_COLORS, DonutChart, Gauge, RevenueChart } from "@/components/dashboard/charts";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const RANGES = [
  { months: 12, label: "Last 12 months" },
  { months: 6, label: "Last 6 months" },
  { months: 3, label: "Last 3 months" },
];

const ACTIVITY_PAGE_SIZE = 5;

export default function OverviewPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [activity, setActivity] = useState<DashboardActivity | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [revenueMonths, setRevenueMonths] = useState(12);
  const [breakdownMonths, setBreakdownMonths] = useState(3);
  const [activityPage, setActivityPage] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getDashboardOverview(revenueMonths, breakdownMonths)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Failed to load the overview");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [revenueMonths, breakdownMonths]);

  useEffect(() => {
    let cancelled = false;
    getDashboardActivity(activityPage, ACTIVITY_PAGE_SIZE)
      .then((data) => {
        if (!cancelled) setActivity(data);
      })
      .catch(() => {
        // The feed is secondary. Its own empty state covers a failure here rather than taking
        // the whole screen down over an audit log.
      });
    return () => {
      cancelled = true;
    };
  }, [activityPage]);

  if (!overview) {
    return error ? (
      <div className="rounded-xl border border-red-200 bg-red-50 p-16 text-center">
        <p className="text-sm font-medium text-red-700">Could not load the overview</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    ) : (
      <div className="rounded-xl border border-border bg-card p-16 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">Loading your overview…</p>
        <p className="mt-1 text-sm text-muted">Gathering invoices, payments and activity.</p>
      </div>
    );
  }

  const { currency, receivables, vat } = overview;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {overview.greetingName ? `Welcome back, ${overview.greetingName}` : "Overview"}
        </h1>
        <Link
          href="/settings"
          aria-label="Settings"
          className="grid size-10 place-items-center rounded-lg border border-border bg-card text-muted transition-colors hover:bg-slate-50 hover:text-foreground"
        >
          <SlidersIcon className="size-4" />
        </Link>
      </header>

      <QuickActions />

      <RevenuePanel
        overview={overview}
        months={revenueMonths}
        onMonthsChange={setRevenueMonths}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ReceivablesPanel
          currency={currency}
          total={receivables.total}
          overdue={receivables.overdue}
          open={receivables.open}
          partiallyPaid={receivables.partiallyPaid}
        />
        <VatPanel currency={currency} vat={vat} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LockedPanel
          title="Bank"
          headline="Account balance"
          hint="Bank accounts are not connected in this system yet. Once transactions can be imported, balances and matching appear here."
          cta={{ label: "Recorded payments", href: "/payments" }}
        />
        <BookkeepingScorePanel />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopClientsPanel
          overview={overview}
          months={breakdownMonths}
          onMonthsChange={setBreakdownMonths}
        />
        <LockedPanel
          title="Top 5 expenses"
          headline="Expenses"
          hint="This system records sales, not purchases. There is no expense or receipt data to rank, so nothing is shown rather than a misleading zero."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TopProductsPanel
          products={overview.topProducts}
          currency={currency}
          months={breakdownMonths}
        />
        <ActivityPanel
          activity={activity}
          page={activityPage}
          onPageChange={setActivityPage}
        />
      </div>

      <p className="pb-2 text-center text-xs text-muted">
        Figures are computed from the invoices and payments recorded in MyVision, at the moment
        this page loaded.
      </p>
    </div>
  );
}

/* --- quick actions -------------------------------------------------------- */

function QuickActions() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <QuickAction href="/invoices/new" label="Write invoice" icon={<InvoiceIcon className="size-5" />} />
      <QuickAction
        label="Upload expense"
        icon={<UploadIcon className="size-5" />}
        disabledReason="Expenses are not part of this system yet"
      />
      <QuickAction href="/payments" label="Match payments" icon={<BankIcon className="size-5" />} />
      <QuickAction href="/reports/taxes" label="Prepare VAT return" icon={<TaxIcon className="size-5" />} />
    </div>
  );
}

function QuickAction({
  href,
  label,
  icon,
  disabledReason,
}: {
  href?: string;
  label: string;
  icon: React.ReactNode;
  disabledReason?: string;
}) {
  const body = (
    <>
      <span className="text-muted">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </>
  );
  const shell =
    "flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors";

  if (!href) {
    return (
      <div
        title={disabledReason}
        aria-disabled
        className={cn(shell, "cursor-not-allowed opacity-60")}
      >
        {body}
      </div>
    );
  }
  return (
    <Link href={href} className={cn(shell, "hover:border-primary/40 hover:bg-slate-50")}>
      {body}
    </Link>
  );
}

/* --- revenue -------------------------------------------------------------- */

function RevenuePanel({
  overview,
  months,
  onMonthsChange,
}: {
  overview: DashboardOverview;
  months: number;
  onMonthsChange: (months: number) => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Invoiced</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
            {formatMoney(overview.revenueInvoicedTotal, overview.currency)}
          </p>
        </div>

        <div className="flex gap-2">
          <SeriesChip
            label="Invoiced"
            value={formatMoney(overview.revenueInvoicedTotal, overview.currency)}
            dotClass="bg-primary"
          />
          <SeriesChip
            label="Collected"
            value={formatMoney(overview.revenueCollectedTotal, overview.currency)}
            dotClass="bg-emerald-500"
          />
        </div>
      </div>

      <div className="mt-6">
        <RevenueChart data={overview.revenue} currency={overview.currency} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <RangeSelect value={months} onChange={onMonthsChange} label="Revenue range" />
        {/* Stated rather than shown as a zero line: no expenses exist to plot. */}
        <p className="text-xs text-muted">
          Profit is not shown — this system records sales, not purchases.
        </p>
      </div>
    </section>
  );
}

function SeriesChip({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: string;
  dotClass: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <span className="flex items-center gap-1.5 text-xs text-muted">
        <span className={cn("size-1.5 rounded-full", dotClass)} />
        {label}
      </span>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function RangeSelect({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (months: number) => void;
  label: string;
}) {
  return (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-8 rounded-lg border border-border bg-card px-2 text-sm text-primary outline-none focus:border-primary"
      >
        {RANGES.map((range) => (
          <option key={range.months} value={range.months}>
            {range.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/* --- receivables ---------------------------------------------------------- */

function ReceivablesPanel({
  currency,
  total,
  overdue,
  open,
  partiallyPaid,
}: {
  currency: string;
  total: number;
  overdue: ReceivablesBucket;
  open: ReceivablesBucket;
  partiallyPaid: ReceivablesBucket;
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Outstanding invoices</h2>

      <div className="mt-4 rounded-lg bg-slate-50 p-4">
        <p className="text-xs text-muted">Outstanding amount</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
          {formatMoney(total, currency)}
        </p>
      </div>

      <div className="mt-2">
        <BucketRow
          label="Overdue"
          bucket={overdue}
          currency={currency}
          href="/invoices?status=overdue"
          tone="danger"
        />
        <BucketRow
          label="Open"
          bucket={open}
          currency={currency}
          href="/invoices?status=unpaid"
          tone="neutral"
        />
        <BucketRow
          label="Partially paid"
          bucket={partiallyPaid}
          currency={currency}
          href="/invoices?status=partially_paid"
          tone="neutral"
        />
      </div>

      <div className="mt-auto pt-4 text-right">
        <Link href="/invoices/reminders" className="text-sm font-medium text-primary hover:underline">
          Send payment reminders →
        </Link>
      </div>
    </section>
  );
}

function BucketRow({
  label,
  bucket,
  currency,
  href,
  tone,
}: {
  label: string;
  bucket: ReceivablesBucket;
  currency: string;
  href: string;
  tone: "danger" | "neutral";
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0 hover:bg-slate-50/70"
    >
      <span className="flex items-center gap-2.5">
        <span
          className={cn(
            "grid min-w-7 place-items-center rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
            tone === "danger" && bucket.count > 0
              ? "bg-red-50 text-red-700"
              : "bg-slate-100 text-slate-600",
          )}
        >
          {bucket.count}
        </span>
        <span className="text-sm text-foreground">{label}</span>
      </span>
      <span className="flex items-center gap-2">
        <span className="text-sm font-medium tabular-nums text-foreground">
          {formatMoney(bucket.amount, currency)}
        </span>
        <ChevronRightIcon className="size-4 text-muted" />
      </span>
    </Link>
  );
}

/* --- VAT ------------------------------------------------------------------ */

function VatPanel({
  currency,
  vat,
}: {
  currency: string;
  vat: DashboardOverview["vat"];
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">VAT advance return</h2>

      <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted">
            Output tax {formatDate(vat.periodStart)} – {formatDate(vat.periodEnd)}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {formatMoney(vat.outputVat, currency)}
          </p>
        </div>
        <div className="sm:border-l sm:border-border sm:pl-4">
          <p className="text-xs text-muted">Due on</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {formatDate(vat.dueDate)}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <VatRow label="Net revenue" value={formatMoney(vat.netRevenue, currency)} />
        <VatRow label="Output tax" value={formatMoney(vat.outputVat, currency)} />
        {/* Not a zero: input tax genuinely cannot be computed here, and saying "0" would make
            the payable figure look like a complete return. */}
        <VatRow label="Input tax" value="Not tracked" muted />
      </div>

      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        Output tax only. Input tax from purchases is not recorded in MyVision, so this is one side
        of the return — review it before filing.
      </p>

      <div className="mt-auto pt-4 text-right">
        <Link href="/reports/taxes" className="text-sm font-medium text-primary hover:underline">
          Open VAT report →
        </Link>
      </div>
    </section>
  );
}

function VatRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border py-3 last:border-0">
      <span className="text-sm text-foreground">{label}</span>
      <span
        className={cn(
          "text-sm tabular-nums",
          muted ? "text-muted" : "font-medium text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

/* --- locked panels -------------------------------------------------------- */

function LockedPanel({
  title,
  headline,
  hint,
  cta,
}: {
  title: string;
  headline: string;
  hint: string;
  cta?: { label: string; href: string };
}) {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>

      <div className="mt-4 rounded-lg bg-slate-50 p-4">
        <p className="text-xs text-muted">{headline}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-300">—</p>
      </div>

      <p className="mt-4 text-sm text-muted">{hint}</p>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
          <LockIcon className="size-3.5" />
          No data source
        </span>
        {cta ? (
          <Link href={cta.href} className="text-sm font-medium text-primary hover:underline">
            {cta.label} →
          </Link>
        ) : null}
      </div>
    </section>
  );
}

function BookkeepingScorePanel() {
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Bookkeeping score</h2>

      <div className="mt-6">
        <Gauge percent={0} muted />
      </div>

      <p className="mt-4 text-sm text-muted">
        The score measures how many bank transactions have a receipt attached. Neither bank
        transactions nor receipts are recorded here yet, so there is nothing to score.
      </p>

      <div className="mt-auto pt-4">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
          <LockIcon className="size-3.5" />
          No data source
        </span>
      </div>
    </section>
  );
}

/* --- rankings ------------------------------------------------------------- */

function TopClientsPanel({
  overview,
  months,
  onMonthsChange,
}: {
  overview: DashboardOverview;
  months: number;
  onMonthsChange: (months: number) => void;
}) {
  const slices = overview.topClients.map((client, index) => ({
    label: client.name,
    value: client.amount,
    color: DONUT_COLORS[index % DONUT_COLORS.length],
  }));
  const total = overview.topClients.reduce((running, client) => running + client.amount, 0);

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Top 5 customers</h2>

      {overview.topClients.length === 0 ? (
        <EmptyBlock
          title="No revenue in this period"
          hint="Once invoices are issued, your largest customers appear here."
        />
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-6">
          <DonutChart slices={slices} total={total} currency={overview.currency} />
          <ul className="min-w-0 flex-1 space-y-2">
            {overview.topClients.map((client, index) => (
              <li key={client.clientId} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }}
                />
                <Link
                  href={`/clients/${client.clientId}`}
                  className="min-w-0 flex-1 truncate text-foreground hover:text-primary hover:underline"
                >
                  {client.name}
                </Link>
                <span className="shrink-0 tabular-nums text-muted">
                  {formatMoney(client.amount, overview.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto pt-4">
        <RangeSelect value={months} onChange={onMonthsChange} label="Customer ranking range" />
      </div>
    </section>
  );
}

function TopProductsPanel({
  products,
  currency,
  months,
}: {
  products: DashboardTopProduct[];
  currency: string;
  months: number;
}) {
  const peak = Math.max(0, ...products.map((product) => product.amount));

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Products and services</h2>
      {/* Named honestly: invoice lines are free text with no link to the catalogue, so this is a
          ranking of line descriptions, not of catalogue products. */}
      <p className="mt-1 text-xs text-muted">
        By invoice line description, last {months} months
      </p>

      {products.length === 0 ? (
        <EmptyBlock
          title="No line revenue in this period"
          hint="Invoice lines issued in this window are grouped and ranked here."
        />
      ) : (
        <ul className="mt-4 space-y-3">
          {products.map((product) => (
            <li key={product.description}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-foreground">{product.description}</span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {formatMoney(product.amount, currency)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${peak > 0 ? (product.amount / peak) * 100 : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto pt-4 text-right">
        <Link href="/products" className="text-sm font-medium text-primary hover:underline">
          All products →
        </Link>
      </div>
    </section>
  );
}

function EmptyBlock({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="py-12 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{hint}</p>
    </div>
  );
}

/* --- activity ------------------------------------------------------------- */

function ActivityPanel({
  activity,
  page,
  onPageChange,
}: {
  activity: DashboardActivity | null;
  page: number;
  onPageChange: (page: number) => void;
}) {
  const total = activity?.total ?? 0;
  const size = activity?.size ?? ACTIVITY_PAGE_SIZE;
  const first = total === 0 ? 0 : page * size + 1;
  const last = Math.min((page + 1) * size, total);
  const hasNext = (page + 1) * size < total;

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">Activity</h2>

      {!activity ? (
        <EmptyBlock title="Loading activity…" hint="Reading the audit trail." />
      ) : activity.entries.length === 0 ? (
        <EmptyBlock
          title="Nothing recorded yet"
          hint="Creating and sending documents leaves an entry here."
        />
      ) : (
        <ul className="mt-4 space-y-4">
          {activity.entries.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-muted">
                <DocumentIcon className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted">
                  {formatDateTime(entry.createdAt)}
                </p>
                <p className="mt-0.5 text-sm text-foreground">{describeActivity(entry)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-end gap-2 pt-4">
        <span className="text-sm text-muted">
          {total === 0 ? "No entries" : `${first} – ${last} of ${total}`}
        </span>
        <button
          type="button"
          aria-label="Previous"
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="grid size-8 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label="Next"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          className="grid size-8 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>
    </section>
  );
}

/** Turns one audit row into a sentence, with the document linked where it still exists. */
function describeActivity(entry: ActivityEntry) {
  const actor = entry.actorName ?? "MyVision";
  const isQuote = entry.entityType === "quote";
  const kind = isQuote ? "quote" : "invoice";

  // Payments and refunds are logged against their own id but resolved to the invoice they moved
  // money against, so the link has to point at that invoice rather than at the payment row.
  const href = isQuote
    ? `/quotes/${entry.entityId}`
    : entry.entityType === "invoice"
      ? `/invoices/${entry.entityId}`
      : "/payments";

  const document = entry.documentLabel ? (
    <Link href={href} className="font-medium text-primary hover:underline">
      {entry.documentLabel}
    </Link>
  ) : (
    // Deliberately vague: an unresolved label means the record is gone or is of a kind this
    // screen does not name. Asserting "a deleted invoice" was simply wrong for a payment.
    <span className="text-muted">a record that no longer exists</span>
  );

  const forClient = entry.clientName ? <> for {entry.clientName}</> : null;

  if (entry.entityType === "company") {
    return (
      <>
        <span className="font-medium">{actor}</span> updated the company profile.
      </>
    );
  }

  if (entry.entityType === "payment" || entry.entityType === "refund") {
    const money = entry.entityType === "payment" ? "a payment" : "a refund";
    const verb = entry.action === "stripe_captured" ? "captured" : "recorded";
    return (
      <>
        <span className="font-medium">{actor}</span> {verb} {money} on {document}
        {entry.clientName ? <> for {entry.clientName}</> : null}.
      </>
    );
  }

  const phrase: Record<string, React.ReactNode> = {
    created: <>created {kind} {document}{forClient}.</>,
    created_from_quote: <>created invoice {document} from a quote{forClient}.</>,
    updated: <>updated {kind} {document}.</>,
    marked_sent: <>marked {kind} {document} as sent.</>,
    sent: <>sent {kind} {document}{forClient}.</>,
    marked_paid: <>marked {kind} {document} as paid.</>,
    cancelled: <>cancelled {kind} {document}.</>,
    accepted: <>recorded {kind} {document} as accepted.</>,
    rejected: <>recorded {kind} {document} as rejected.</>,
    pdf_generated: <>generated a PDF for {kind} {document}.</>,
    xrechnung_exported: <>exported {kind} {document} as XRechnung.</>,
    stripe_payment_failed: <>saw a payment fail for {kind} {document}.</>,
  };

  return (
    <>
      <span className="font-medium">{actor}</span>{" "}
      {phrase[entry.action] ?? (
        <>
          recorded &quot;{entry.action.replace(/_/g, " ")}&quot; on {kind} {document}.
        </>
      )}
    </>
  );
}

/** "3 Aug 2026, 07:52" — the feed needs the time of day, which formatDate drops. */
function formatDateTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
const ChevronLeftIcon = icon(<path d="m14 6-6 6 6 6" />);
const ChevronRightIcon = icon(<path d="m10 6 6 6-6 6" />);
const SlidersIcon = icon(<><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="currentColor" /><circle cx="15" cy="12" r="2" fill="currentColor" /><circle cx="8" cy="18" r="2" fill="currentColor" /></>);
const InvoiceIcon = icon(<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></>);
const UploadIcon = icon(<><path d="M12 16V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></>);
const BankIcon = icon(<><path d="M3 10h18" /><path d="m12 3 9 5H3Z" /><path d="M6 10v7M12 10v7M18 10v7" /><path d="M3 20h18" /></>);
const TaxIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="m9 15 6-6" /><circle cx="9.5" cy="9.5" r="1.2" /><circle cx="14.5" cy="14.5" r="1.2" /></>);
const LockIcon = icon(<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>);
const DocumentIcon = icon(<><path d="M6 3h7l5 5v13H6Z" /><path d="M13 3v5h5" /></>);
