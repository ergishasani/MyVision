"use client";

import { useState } from "react";
import { useT } from "@/components/providers/locale-provider";
import { format } from "@/lib/i18n/format";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------------------------------------------------
 * Shared page chrome. Every dashboard section is built from these pieces so the
 * whole app reads as one product rather than a set of differently-shaped pages.
 * ------------------------------------------------------------------------ */

export type Column = {
  key: string;
  label: string;
  /** Right-aligns the column. Use for money and other figures so digits line up. */
  numeric?: boolean;
  className?: string;
};

type PageShellProps = {
  title: string;
  description?: string;
  /** Small figure shown under the title, e.g. "Outstanding: EUR 12,340.00". */
  summary?: string;
  action?: { label: string; href?: string };
  tabs?: readonly Tab[];
  columns?: Column[];
  /** Message for the empty table. Defaults to a neutral "nothing here yet". */
  emptyTitle?: string;
  emptyHint?: string;
  /** Table body rows. Omit to render the empty state. */
  rows?: React.ReactNode;
  /** Row count, shown in the pagination footer. */
  total?: number;
  children?: React.ReactNode;
};

export function PageShell({
  title,
  description,
  summary,
  action,
  tabs,
  columns,
  emptyTitle,
  emptyHint,
  rows,
  total,
  children,
}: PageShellProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} summary={summary} action={action} />

      {tabs || columns ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          {tabs ? <TabBar tabs={tabs} /> : null}
          {columns ? (
            <DataTable
              columns={columns}
              emptyTitle={emptyTitle}
              emptyHint={emptyHint}
              rows={rows}
              total={total}
            />
          ) : null}
        </section>
      ) : null}

      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  summary,
  action,
}: {
  title: string;
  description?: string;
  summary?: string;
  action?: { label: string; href?: string };
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {summary ? <p className="mt-1 text-sm font-medium text-foreground">{summary}</p> : null}
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>

      {action ? (
        <a
          href={action.href ?? "#"}
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-primary px-4",
            "text-sm font-medium text-primary-foreground transition-colors hover:bg-blue-700",
          )}
        >
          <PlusIcon className="size-4" />
          {action.label}
        </a>
      ) : null}
    </header>
  );
}

/**
 * Filter tabs plus the export/filter controls.
 *
 * <p>Uncontrolled by default so scaffold pages need no state. Pass value/onChange when the
 * selection has to drive real filtering.
 */
/**
 * A tab is either a bare string, or a key/label pair.
 *
 * <p>The pair matters once the UI is translated: filtering switches on the key, so it must not
 * change when the label does. A page that filters on the visible English word breaks the moment
 * someone selects German.
 */
export type Tab = string | { key: string; label: string };

function tabKey(tab: Tab) {
  return typeof tab === "string" ? tab : tab.key;
}

function tabLabel(tab: Tab) {
  return typeof tab === "string" ? tab : tab.label;
}

export function TabBar({
  tabs,
  value,
  onChange,
  counts,
}: {
  tabs: readonly Tab[];
  value?: string;
  onChange?: (tab: string) => void;
  counts?: Record<string, number>;
}) {
  const t = useT();
  const [internal, setInternal] = useState(tabKey(tabs[0]));
  const active = value ?? internal;
  const setActive = (tab: string) => (onChange ? onChange(tab) : setInternal(tab));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-1">
        {tabs.map((tab) => {
          const key = tabKey(tab);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              aria-pressed={active === key}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm transition-colors",
                active === key
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted hover:bg-slate-100 hover:text-foreground",
              )}
            >
              {tabLabel(tab)}
              {counts && counts[key] !== undefined ? (
                <span className="ml-1.5 text-xs opacity-70">{counts[key]}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <ToolbarButton icon={<FilterIcon className="size-4" />} label={t.table.filter} />
        <ToolbarButton icon={<ExportIcon className="size-4" />} label={t.table.export} />
      </div>
    </div>
  );
}

function ToolbarButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  const t = useT();
  return (
    <button
      type="button"
      disabled
      title={format(t.table.disabledHint, { label })}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm text-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * Table shell with its empty state.
 *
 * <p>Deliberately renders no sample rows. Placeholder invoices and amounts in a billing product
 * are indistinguishable from real ones at a glance, and that is a bad habit to build in.
 */
export function DataTable({
  columns,
  emptyTitle,
  emptyHint,
  rows,
  total,
}: {
  columns: Column[];
  emptyTitle?: string;
  emptyHint?: string;
  rows?: React.ReactNode;
  total?: number;
}) {
  const t = useT();
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/70">
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted",
                    column.numeric && "text-right",
                    column.className,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows ?? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-16">
                <div className="mx-auto max-w-sm text-center">
                  <div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100">
                    <InboxIcon className="size-5 text-muted" />
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {emptyTitle ?? t.table.emptyTitle}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {emptyHint ?? t.table.emptyHint}
                  </p>
                </div>
              </td>
            </tr>
            )}
          </tbody>
        </table>
      </div>

      <Pagination total={total ?? 0} />
    </>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <tr className="border-b border-border last:border-0 hover:bg-slate-50/70">{children}</tr>;
}

export function Cell({
  children,
  numeric,
}: {
  children: React.ReactNode;
  numeric?: boolean;
}) {
  return (
    <td className={cn("px-4 py-3 text-sm text-foreground", numeric && "text-right tabular-nums")}>
      {children}
    </td>
  );
}

export function Pagination({ total = 0 }: { total?: number }) {
  const t = useT();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
      <p className="text-sm text-muted">
        {total === 0
          ? t.table.noEntries
          : format(t.table.showing, { shown: Math.min(25, total), total })}
      </p>
      <div className="flex items-center gap-1">
        <PageButton label={t.table.previous} disabled>
          <ChevronLeftIcon className="size-4" />
        </PageButton>
        <span className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-medium text-primary-foreground">
          1
        </span>
        <PageButton label={t.table.next} disabled>
          <ChevronRightIcon className="size-4" />
        </PageButton>
      </div>
    </div>
  );
}

function PageButton({
  children,
  label,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-lg border border-border text-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** Coloured status badge, matching the invoice, quote and project lifecycles. */
export function StatusPill({ status }: { status: string }) {
  const t = useT();
  // Takes the raw status or a humanised label ("Partially paid"), so a screen can print a
  // readable word without the badge losing the colour that belongs to it.
  const key = status.toLowerCase().replace(/ /g, "_");
  const tone = STATUS_TONES[key] ?? "bg-slate-100 text-slate-700";
  // Falls back to whatever was passed for a status the dictionary does not know, which is better
  // than a blank badge on a lifecycle this component has not been taught yet.
  const label = (t.status as Record<string, string>)[key] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

const STATUS_TONES: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-50 text-blue-700",
  unpaid: "bg-amber-50 text-amber-700",
  partially_paid: "bg-amber-50 text-amber-700",
  overdue: "bg-red-50 text-red-700",
  paid: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-500",
  accepted: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  converted: "bg-blue-50 text-blue-700",
  expired: "bg-slate-100 text-slate-500",
  active: "bg-blue-50 text-blue-700",
  paused: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
};

/** Card grid used by settings and report sections, which are not lists. */
export function PanelGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}

export function Panel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </div>
  );
}

/* --- icons ---------------------------------------------------------------- */

type IconProps = { className?: string };

function icon(path: React.ReactNode) {
  return function Icon({ className }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        {path}
      </svg>
    );
  };
}

const PlusIcon = icon(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
const FilterIcon = icon(<path d="M3 5h18l-7 8v6l-4 2v-8Z" />);
const ExportIcon = icon(<><path d="M12 16V4" /><path d="m7.5 8.5 4.5-4.5 4.5 4.5" /><path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></>);
const InboxIcon = icon(<><path d="M3 13h5l1.5 2.5h5L16 13h5" /><path d="M4.5 5h15l1.5 8v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4Z" /></>);
const ChevronLeftIcon = icon(<path d="m14 6-6 6 6 6" />);
const ChevronRightIcon = icon(<path d="m10 6 6 6-6 6" />);
