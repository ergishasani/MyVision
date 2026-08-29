"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { getVatReturn } from "@/lib/api/reports";
import { ElsterBanner } from "@/components/reports/elster-banner";
import type { VatReturn, VatReturnGroup, VatReturnLine } from "@/types/api";
import { formatDate, formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type Cadence = "quarterly" | "monthly" | "yearly";

const QUARTERS = [
  { label: "Jan – Mar", startMonth: 1, months: 3 },
  { label: "Apr – Jun", startMonth: 4, months: 3 },
  { label: "Jul – Sep", startMonth: 7, months: 3 },
  { label: "Oct – Dec", startMonth: 10, months: 3 },
];

/** One period spanning the whole calendar year. */
const YEARLY = [{ label: "Jan – Dec", startMonth: 1, months: 12 }];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** ISO `YYYY-MM-DD` for the first day of a month, built without touching timezones. */
function firstOf(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** Last day of the period starting at `month` and running `count` months. */
function lastOf(year: number, month: number, count: number) {
  const endMonth = month + count - 1;
  // Day 0 of the following month is the last day of this one, and handles leap years for free.
  const date = new Date(Date.UTC(year, endMonth, 0));
  return date.toISOString().slice(0, 10);
}

/** The period a business would currently be filing for. */
function currentPeriodIndex(cadence: Cadence, year: number) {
  // A year has one period, so there is nothing to choose within it.
  if (cadence === "yearly") return 0;
  const now = new Date();
  if (now.getFullYear() !== year) return 0;
  return cadence === "quarterly" ? Math.floor(now.getMonth() / 3) : now.getMonth();
}

export default function VatReturnPage() {
  const thisYear = new Date().getFullYear();

  const [cadence, setCadence] = useState<Cadence>("quarterly");
  const [year, setYear] = useState(thisYear);
  const [index, setIndex] = useState(() => currentPeriodIndex("quarterly", thisYear));

  const [loaded, setLoaded] = useState<{ key: string; data: VatReturn } | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  // Collapsed by default, like the form's own software. The block totals are the answer most of
  // the time; the twenty-odd statutory lines are for when someone is checking one.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const periods =
    cadence === "quarterly"
      ? QUARTERS.map((q) => ({ label: q.label, startMonth: q.startMonth, months: 3 }))
      : cadence === "yearly"
        ? YEARLY
        : MONTHS.map((label, i) => ({ label, startMonth: i + 1, months: 1 }));

  const period = periods[Math.min(index, periods.length - 1)];
  const from = firstOf(year, period.startMonth);
  const to = lastOf(year, period.startMonth, period.months);
  const key = `${from}:${to}`;

  const data = loaded?.key === key ? loaded.data : null;
  const error = failed?.key === key ? failed.message : null;

  useEffect(() => {
    let cancelled = false;
    getVatReturn(from, to)
      .then((result) => {
        if (!cancelled) setLoaded({ key, data: result });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailed({
          key,
          message: err instanceof ApiError ? err.message : "Failed to load the VAT return",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, key]);

  const years = useMemo(
    () => Array.from({ length: 5 }, (_, i) => thisYear - i),
    [thisYear],
  );

  function exportCsv() {
    if (!data) return;
    const cell = (value: string) =>
      /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const money = (value: number | null) =>
      value === null ? "" : value.toFixed(2).replace(".", ",");

    const rows: string[] = [];
    for (const group of data.groups) {
      // The block heading is exported too, so the spreadsheet keeps the form's shape.
      rows.push([cell(group.label), "", money(group.basis), "", money(group.tax),
        group.derived ? "" : "not tracked in MyVision"].join(";"));
      for (const line of group.lines) {
        rows.push([
          cell(`  ${line.label}`),
          line.basisCode ?? "",
          money(line.basis),
          line.taxCode ?? "",
          money(line.tax),
          "",
        ].join(";"));
      }
    }
    const csv = "﻿" + [
      `Period;${formatDate(data.from)} - ${formatDate(data.to)}`,
      `Currency;${data.currency}`,
      "",
      "Description;Position;Basis of assessment;Position;Tax amount;Note",
      ...rows,
      "",
      `Output tax;;;;${data.outputTaxTotal.toFixed(2).replace(".", ",")}`,
      "Payable to the tax office;83;;;not computable - input tax is not recorded in MyVision",
    ].join("\r\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `vat-return-${from}-to-${to}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">VAT return</h1>
          <p className="mt-1 text-sm font-medium text-foreground">
            {data
              ? `Output tax: ${formatMoney(data.outputTaxTotal, data.currency)}`
              : "Advance return (UStVA)"}
          </p>
          <p className="mt-1 text-sm text-muted">
            What this system recorded for the period, laid out as the form.
          </p>
        </div>

        <button
          type="button"
          onClick={exportCsv}
          disabled={!data}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ExportIcon className="size-4" />
          Export for my tax advisor
        </button>
      </header>

      {/* The single most important thing on this screen. A VAT return is output tax minus input
          tax; this system has only the first half, so what it shows is an input to a filing, not
          a filing. Placed above the figures rather than under them. */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">This is not a completed return</p>
        <p className="mt-1 text-sm text-amber-800">
          MyVision records sales, not purchases. Deductible input tax (Kz 66) has no source here,
          so the amount payable cannot be computed, and the tax-free, intra-community and reverse-charge
          categories are not tracked at all. Use these figures as input for your tax advisor or
          Elster submission — do not file from them directly.
        </p>
      </div>

      {/* Placed under the caveat rather than above it. sevdesk leads with this banner, but on a
          screen whose headline finding is "this is not a completed return", a promotion should
          not be the first thing read. One line to swap if you disagree. */}
      {/* The document card runs the same export as the header button, so the panel does the thing
          it depicts rather than advertising it. Passed only when there is data to export. */}
      <ElsterBanner onExport={data ? exportCsv : undefined} />

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Period</span>
            <select
              value={cadence}
              onChange={(event) => {
                const next = event.target.value as Cadence;
                setCadence(next);
                setIndex(currentPeriodIndex(next, year));
              }}
              className="h-10 w-40 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            >
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">Year</span>
            <select
              value={year}
              onChange={(event) => setYear(Number(event.target.value))}
              className="h-10 w-32 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          className={cn(
            "mt-4 grid gap-3",
            cadence === "yearly"
              ? "sm:max-w-xs"
              : cadence === "quarterly"
                ? "sm:grid-cols-4"
                : "sm:grid-cols-4 lg:grid-cols-6",
          )}
        >
          {periods.map((p, i) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              className={cn(
                "rounded-xl border p-3 text-left transition-colors",
                i === index
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-slate-50",
              )}
            >
              <span
                className={cn(
                  "block text-sm font-medium",
                  i === index ? "text-primary" : "text-foreground",
                )}
              >
                {p.label}
              </span>
              <span className="block text-xs text-muted">{year}</span>
            </button>
          ))}
        </div>
      </section>

      {cadence === "yearly" ? (
        <p className="text-sm text-muted">
          A full year in the advance-return layout. Germany&apos;s annual filing
          (Umsatzsteuer-Jahreserkl&auml;rung) is a separate form from the UStVA shown here — this
          totals the year, it does not prepare that return.
        </p>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Could not load the VAT return</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/70">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Description
                </th>
                <th className="w-20 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Position
                </th>
                <th className="w-40 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Basis of assessment
                </th>
                <th className="w-20 px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Position
                </th>
                <th className="w-36 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Tax amount
                </th>
              </tr>
            </thead>
            <tbody>
              {!data ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-sm text-muted">
                    {error ? "Nothing to show." : "Loading the period…"}
                  </td>
                </tr>
              ) : (
                data.groups.map((group) => (
                  <GroupRows
                    key={group.label}
                    group={group}
                    currency={data.currency}
                    open={expanded.has(group.label)}
                    onToggle={() =>
                      setExpanded((current) => {
                        const next = new Set(current);
                        if (next.has(group.label)) {
                          next.delete(group.label);
                        } else {
                          next.add(group.label);
                        }
                        return next;
                      })
                    }
                  />
                ))
              )}
            </tbody>

            {data ? (
              <tfoot>
                <tr className="border-t border-border bg-slate-50/70">
                  <td className="px-4 py-3 font-medium text-foreground">Output tax</td>
                  <td className="px-3 py-3" />
                  <td className="px-4 py-3" />
                  <td className="px-3 py-3" />
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                    {formatMoney(data.outputTaxTotal, data.currency)}
                  </td>
                </tr>
                <tr className="border-t border-border">
                  <td className="px-4 py-3 font-medium text-foreground">
                    Payable to the tax office
                    <span className="block text-xs font-normal text-muted">
                      Output tax less deductible input tax
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-xs tabular-nums text-muted">83</td>
                  <td className="px-4 py-3" />
                  <td className="px-3 py-3" />
                  <td className="px-4 py-3 text-right">
                    {/* Never a number while input tax is missing. A zero here is exactly the
                        mistake that ends up on a filed form. */}
                    <span className="text-sm font-medium text-amber-700">Cannot be computed</span>
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        {data ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted">
            <span>
              {formatDate(data.from)} – {formatDate(data.to)} · {data.invoiceCount} invoice
              {data.invoiceCount === 1 ? "" : "s"}
            </span>
            <Link href="/invoices" className="font-medium text-primary hover:underline">
              Review the invoices →
            </Link>
          </div>
        ) : null}
      </section>

      <p className="pb-2 text-center text-xs text-muted">
        Computed from issued invoices on the date they were issued, which is when German VAT falls
        due on the standard scheme. Drafts and cancelled invoices are excluded.
      </p>
    </div>
  );
}

function GroupRows({
  group,
  currency,
  open,
  onToggle,
}: {
  group: VatReturnGroup;
  currency: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-border bg-slate-50/40">
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="flex items-center gap-2 text-left font-medium text-foreground"
          >
            <ChevronIcon
              className={cn("size-4 shrink-0 text-muted transition-transform", open && "rotate-90")}
            />
            {group.label}
            {!group.derived ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-muted">
                not tracked
              </span>
            ) : null}
          </button>
        </td>
        <td className="px-3 py-3" />
        <td className="px-4 py-3 text-right tabular-nums">
          <Amount value={group.basis} currency={currency} strong />
        </td>
        <td className="px-3 py-3" />
        <td className="px-4 py-3 text-right tabular-nums">
          <Amount value={group.tax} currency={currency} strong />
        </td>
      </tr>

      {open
        ? group.lines.map((line) => (
            <FormRow key={line.label} line={line} currency={currency} />
          ))
        : null}
    </>
  );
}

function FormRow({ line, currency }: { line: VatReturnLine; currency: string }) {
  return (
    <tr className="border-b border-border last:border-0">
      {/* Indented rather than nested in its own table, so every line stays on the same column
          grid as the block totals above it. */}
      <td className="py-2.5 pl-12 pr-4 text-sm text-muted">{line.label}</td>
      <td className="px-3 py-2.5 text-right text-xs tabular-nums text-muted">
        {line.basisCode ?? ""}
      </td>
      <td className="px-4 py-2.5 text-right text-sm tabular-nums">
        <Amount value={line.basis} currency={currency} />
      </td>
      <td className="px-3 py-2.5 text-right text-xs tabular-nums text-muted">
        {line.taxCode ?? ""}
      </td>
      <td className="px-4 py-2.5 text-right text-sm tabular-nums">
        <Amount value={line.tax} currency={currency} />
      </td>
    </tr>
  );
}

/**
 * A figure, or an em dash when there is none.
 *
 * <p>Null prints as a dash rather than as nought throughout. On a tax form those mean different
 * things: nought says the box was checked and found empty, a dash says this system never had the
 * data. Only one of those is true here.
 */
function Amount({
  value,
  currency,
  strong,
}: {
  value: number | null;
  currency: string;
  strong?: boolean;
}) {
  if (value === null) {
    return <span className="text-muted">—</span>;
  }
  return (
    <span className={strong ? "font-medium text-foreground" : "text-foreground"}>
      {formatMoney(value, currency)}
    </span>
  );
}

const ChevronIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m10 6 6 6-6 6" />
  </svg>
);

const ExportIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M12 16V4" />
    <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
  </svg>
);
