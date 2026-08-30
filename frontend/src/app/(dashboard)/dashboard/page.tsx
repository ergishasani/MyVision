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
import { useT } from "@/components/providers/locale-provider";
import { format } from "@/lib/i18n/format";
import { Interpolate } from "@/lib/i18n/interpolate";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";

/** Selectable range lengths, with their wording from the dictionary. */
const ranges = (d: Dictionary["dashboard"]) => [
  { months: 12, label: d.range12 },
  { months: 6, label: d.range6 },
  { months: 3, label: d.range3 },
];

const ACTIVITY_PAGE_SIZE = 5;

export default function OverviewPage() {
  const d = useT().dashboard;
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
          setError(err instanceof ApiError ? err.message : d.loadError);
        }
      });
    return () => {
      cancelled = true;
    };
    // The dictionary is only read for the failure message; re-running on a language switch
    // would refetch the whole overview for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <p className="text-sm font-medium text-red-700">{d.loadErrorHeading}</p>
        <p className="mt-1 text-sm text-red-600">{error}</p>
      </div>
    ) : (
      <div className="rounded-xl border border-border bg-card p-16 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">{d.overviewLoading}</p>
        <p className="mt-1 text-sm text-muted">{d.loadingHint}</p>
      </div>
    );
  }

  const { currency, receivables, vat } = overview;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {overview.greetingName
            ? format(d.welcomeBack, { name: overview.greetingName })
            : d.overview}
        </h1>
        <Link
          href="/settings"
          aria-label={d.settingsAria}
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
          title={d.bankTitle}
          headline={d.bankHeadline}
          hint={d.bankHint}
          cta={{ label: d.bankCta, href: "/payments" }}
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
          title={d.expensesTitle}
          headline={d.expensesHeadline}
          hint={d.expensesHint}
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
        {d.footnote}
      </p>
    </div>
  );
}

/* --- quick actions -------------------------------------------------------- */

function QuickActions() {
  const d = useT().dashboard;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <QuickAction href="/invoices/new" label={d.writeInvoice} icon={<InvoiceIcon className="size-5" />} />
      <QuickAction
        label={d.uploadExpense}
        icon={<UploadIcon className="size-5" />}
        disabledReason={d.uploadExpenseDisabled}
      />
      <QuickAction href="/payments" label={d.matchPayments} icon={<BankIcon className="size-5" />} />
      <QuickAction href="/reports/taxes" label={d.prepareVat} icon={<TaxIcon className="size-5" />} />
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
  const d = useT().dashboard;
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{d.invoiced}</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-foreground">
            {formatMoney(overview.revenueInvoicedTotal, overview.currency)}
          </p>
        </div>

        <div className="flex gap-2">
          <SeriesChip
            label={d.invoiced}
            value={formatMoney(overview.revenueInvoicedTotal, overview.currency)}
            dotClass="bg-primary"
          />
          <SeriesChip
            label={d.collected}
            value={formatMoney(overview.revenueCollectedTotal, overview.currency)}
            dotClass="bg-emerald-500"
          />
        </div>
      </div>

      <div className="mt-6">
        <RevenueChart data={overview.revenue} currency={overview.currency} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <RangeSelect value={months} onChange={onMonthsChange} label={d.revenueRange} />
        {/* Stated rather than shown as a zero line: no expenses exist to plot. */}
        <p className="text-xs text-muted">
          {d.noProfitNote}
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
  const d = useT().dashboard;

  return (
    <label className="text-sm">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-8 rounded-lg border border-border bg-card px-2 text-sm text-primary outline-none focus:border-primary"
      >
        {ranges(d).map((range) => (
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
  const d = useT().dashboard;
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{d.outstandingTitle}</h2>

      <div className="mt-4 rounded-lg bg-slate-50 p-4">
        <p className="text-xs text-muted">{d.outstandingAmount}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
          {formatMoney(total, currency)}
        </p>
      </div>

      <div className="mt-2">
        <BucketRow
          label={d.bucketOverdue}
          bucket={overdue}
          currency={currency}
          href="/invoices?status=overdue"
          tone="danger"
        />
        <BucketRow
          label={d.bucketOpen}
          bucket={open}
          currency={currency}
          href="/invoices?status=unpaid"
          tone="neutral"
        />
        <BucketRow
          label={d.bucketPartiallyPaid}
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
  const d = useT().dashboard;
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{d.vatTitle}</h2>

      <div className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted">
            {format(d.vatOutputPeriod, {
              from: formatDate(vat.periodStart),
              to: formatDate(vat.periodEnd),
            })}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {formatMoney(vat.outputVat, currency)}
          </p>
        </div>
        <div className="sm:border-l sm:border-border sm:pl-4">
          <p className="text-xs text-muted">{d.vatDueOn}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {formatDate(vat.dueDate)}
          </p>
        </div>
      </div>

      <div className="mt-2">
        <VatRow label={d.vatNetRevenue} value={formatMoney(vat.netRevenue, currency)} />
        <VatRow label={d.vatOutputTax} value={formatMoney(vat.outputVat, currency)} />
        {/* Not a zero: input tax genuinely cannot be computed here, and saying "0" would make
            the payable figure look like a complete return. */}
        <VatRow label={d.vatInputTax} value={d.vatNotTracked} muted />
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
  const d = useT().dashboard;
  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{d.bookkeepingScore}</h2>

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
  const d = useT().dashboard;
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
          title={d.noRevenueTitle}
          hint={d.noRevenueHint}
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
        <RangeSelect value={months} onChange={onMonthsChange} label={d.customerRange} />
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
  const d = useT().dashboard;
  const peak = Math.max(0, ...products.map((product) => product.amount));

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{d.productsTitle}</h2>
      {/* Named honestly: invoice lines are free text with no link to the catalogue, so this is a
          ranking of line descriptions, not of catalogue products. */}
      <p className="mt-1 text-xs text-muted">
        By invoice line description, last {months} months
      </p>

      {products.length === 0 ? (
        <EmptyBlock
          title={d.noLineRevenueTitle}
          hint={d.noLineRevenueHint}
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
  const d = useT().dashboard;
  const total = activity?.total ?? 0;
  const size = activity?.size ?? ACTIVITY_PAGE_SIZE;
  const first = total === 0 ? 0 : page * size + 1;
  const last = Math.min((page + 1) * size, total);
  const hasNext = (page + 1) * size < total;

  return (
    <section className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{d.activityTitle}</h2>

      {!activity ? (
        <EmptyBlock title={d.activityLoading} hint={d.activityLoadingHint} />
      ) : activity.entries.length === 0 ? (
        <EmptyBlock
          title={d.activityEmpty}
          hint={d.activityEmptyHint}
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
                <p className="mt-0.5 text-sm text-foreground"><ActivityDescription entry={entry} /></p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex items-center justify-end gap-2 pt-4">
        <span className="text-sm text-muted">
          {total === 0
            ? d.noEntries
            : format(d.activityRange, { first, last, total })}
        </span>
        <button
          type="button"
          aria-label={d.previous}
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="grid size-8 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          aria-label={d.next}
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

/**
 * Turns one audit row into a sentence, with the document linked where it still exists.
 *
 * <p>Each language owns the whole sentence rather than having it assembled from fragments here:
 * German puts the participle at the end ("… hat Rechnung R-14 für Acme erstellt"), so an English
 * frame with holes in it cannot be reused. {@link Interpolate} drops the linked document node
 * back into whatever position the translation puts it.
 */
function ActivityDescription({ entry }: { entry: ActivityEntry }) {
  const a = useT().dashboard.activity;
  const actor = entry.actorName ?? a.actorFallback;
  const isQuote = entry.entityType === "quote";
  const kind = isQuote ? a.kindQuote : a.kindInvoice;

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
    <span className="text-muted">{a.missingRecord}</span>
  );

  const values: Record<string, React.ReactNode> = {
    actor: <span className="font-medium">{actor}</span>,
    kind,
    document,
    client: entry.clientName,
    action: entry.action.replace(/_/g, " "),
  };

  const hasClient = Boolean(entry.clientName);

  if (entry.entityType === "company") {
    return <Interpolate template={a.company} values={values} />;
  }

  if (entry.entityType === "payment" || entry.entityType === "refund") {
    // Verb and noun vary together, so each combination is its own sentence rather than two
    // fragments glued in an order only English accepts.
    const captured = entry.action === "stripe_captured";
    const noun = entry.entityType === "payment" ? "payment" : "refund";
    const verb = captured ? "Captured" : "Recorded";
    const key = `${noun}${verb}${hasClient ? "For" : ""}` as keyof typeof a;
    return <Interpolate template={a[key]} values={values} />;
  }

  // Actions that name the client have a second wording for it; the rest have one.
  const PHRASES: Record<string, keyof typeof a> = {
    created: hasClient ? "createdFor" : "created",
    created_from_quote: hasClient ? "createdFromQuoteFor" : "createdFromQuote",
    updated: "updated",
    marked_sent: "markedSent",
    sent: hasClient ? "sentFor" : "sent",
    marked_paid: "markedPaid",
    cancelled: "cancelled",
    accepted: "accepted",
    rejected: "rejected",
    pdf_generated: "pdfGenerated",
    xrechnung_exported: "xrechnungExported",
    stripe_payment_failed: "stripePaymentFailed",
  };

  const key = PHRASES[entry.action];
  return <Interpolate template={key ? a[key] : a.fallback} values={values} />;
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
