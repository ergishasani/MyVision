"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  createBookingAccount,
  createCostCenter,
  deleteBookingAccount,
  deleteCostCenter,
  listBookingAccounts,
  listCostCenters,
  listNumberRanges,
  updateNumberRange,
} from "@/lib/api/settings";
import type { BookingAccount, CostCenter, NumberRange } from "@/types/api";
import { useT } from "@/components/providers/locale-provider";
import { format } from "@/lib/i18n/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";

/** Tab keys, deliberately not the visible labels -- those change with the language. */
const TABS = [
  "numberRanges",
  "bookingAccounts",
  "paymentMethods",
  "costCentres",
] as const;
type Tab = (typeof TABS)[number];

/** What each counter is called on screen, and what it numbers. */
type RangeMeta = { label: string; hint: string };

function rangeMeta(t: Dictionary["accounting"], type: string): RangeMeta {
  const labels = t.rangeLabels as Record<string, RangeMeta | undefined>;
  return labels[type] ?? { label: type, hint: "" };
}

export default function AccountingSettingsPage() {
  const c = useT().accounting;
  const [tab, setTab] = useState<Tab>("numberRanges");
  const [ranges, setRanges] = useState<NumberRange[]>([]);
  const [accounts, setAccounts] = useState<BookingAccount[]>([]);
  const [centers, setCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listNumberRanges(), listBookingAccounts(), listCostCenters()])
      .then(([r, a, c]) => {
        setRanges(r);
        setAccounts(a);
        setCenters(c);
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : c.loadError),
      )
      .finally(() => setLoading(false));
    // The dictionary is only read for the failure message; re-running on a language switch
    // would refetch every setting for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{c.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {c.description}
        </p>
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
        <div className="flex flex-wrap gap-1 border-b border-border px-4">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setTab(name)}
              aria-pressed={tab === name}
              className={cn(
                "-mb-px border-b-2 px-3 py-3 text-sm transition-colors",
                tab === name
                  ? "border-primary font-medium text-primary"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {c.tabs[name]}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted">{c.loading}</p>
          ) : tab === "numberRanges" ? (
            <NumberRanges ranges={ranges} onChange={setRanges} onError={setError} />
          ) : tab === "bookingAccounts" ? (
            <BookingAccounts accounts={accounts} onChange={setAccounts} onError={setError} />
          ) : tab === "paymentMethods" ? (
            <PaymentMethods />
          ) : (
            <CostCenters centers={centers} onChange={setCenters} onError={setError} />
          )}
        </div>
      </section>

      <p className="text-sm text-muted">
        {c.bankNote}
      </p>
    </div>
  );
}

/**
 * The numbering counters.
 *
 * <p>Each row previews the next document number, because a template with %NUMBER in it is not
 * something anyone should have to evaluate in their head.
 */
function NumberRanges({
  ranges,
  onChange,
  onError,
}: {
  ranges: NumberRange[];
  onChange: (ranges: NumberRange[]) => void;
  onError: (message: string | null) => void;
}) {
  const c = useT().accounting;
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState({ format: "", padding: 0, nextNumber: 1 });
  const [saving, setSaving] = useState(false);

  const current = useMemo(() => ranges.find((r) => r.type === editing), [ranges, editing]);

  function startEdit(range: NumberRange) {
    setEditing(range.type);
    setDraft({ format: range.format, padding: range.padding, nextNumber: range.nextNumber });
    onError(null);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    onError(null);
    try {
      const updated = await updateNumberRange(editing as NumberRange["type"], draft);
      onChange(ranges.map((r) => (r.type === updated.type ? updated : r)));
      setEditing(null);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : c.rangeUpdateError);
    } finally {
      setSaving(false);
    }
  }

  // Rendered live so the effect of a format is visible before saving it.
  const preview = draft.format.replace(
    "%NUMBER",
    draft.padding > 0
      ? String(draft.nextNumber).padStart(draft.padding, "0")
      : String(draft.nextNumber),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.colType}</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.colFormat}</th>
            <th scope="col" className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted">{c.colNextNumber}</th>
            <th scope="col" className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.colNextDocument}</th>
            <th scope="col" className="w-20 px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {ranges.map((range) => {
            const meta = rangeMeta(c, range.type);
            return (
              <tr key={range.type} className="border-b border-border last:border-0">
                <td className="px-3 py-3">
                  <span className="font-medium text-foreground">{meta.label}</span>
                  {meta.hint ? (
                    <span className="block text-xs text-muted">{meta.hint}</span>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-foreground">
                    {range.format}
                  </code>
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted">{range.nextNumber}</td>
                <td className="px-3 py-3 font-medium tabular-nums text-foreground">
                  {range.preview}
                </td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => startEdit(range)}
                    className="rounded-md px-2 py-1 text-sm font-medium text-primary hover:bg-primary/5"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {current ? (
        <div className="mt-5 rounded-xl border border-border bg-slate-50/60 p-4">
          <p className="text-sm font-medium text-foreground">
            {format(c.editHeading, { type: rangeMeta(c, current.type).label })}
          </p>

          <div className="mt-3 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">{c.colFormat}</span>
              <input
                value={draft.format}
                onChange={(event) => setDraft({ ...draft, format: event.target.value })}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 font-mono text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="mt-1 block text-xs text-muted">
                {c.formatHint}
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">{c.padding}</span>
              <input
                type="number"
                min={0}
                max={12}
                value={draft.padding}
                onChange={(event) => setDraft({ ...draft, padding: Number(event.target.value) })}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="mt-1 block text-xs text-muted">
                {c.paddingHint}
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">{c.colNextNumber}</span>
              <input
                type="number"
                min={current.nextNumber}
                value={draft.nextNumber}
                onChange={(event) => setDraft({ ...draft, nextNumber: Number(event.target.value) })}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <span className="mt-1 block text-xs text-muted">
                Can be raised, never lowered. Currently {current.nextNumber}.
              </span>
            </label>
          </div>

          <p className="mt-4 text-sm text-muted">
            The next document will be{" "}
            <span className="font-medium tabular-nums text-foreground">{preview || "—"}</span>
          </p>

          {/* Stated plainly rather than discovered through a 400 after saving. */}
          <p className="mt-2 text-xs text-muted">
            A number that has been issued cannot be handed out again — §14 UStG requires invoice
            numbers to be unique and continuous — so this counter only moves forward. Raising it is
            how you carry on from a previous system.
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="h-9 rounded-lg px-4 text-sm font-medium text-foreground hover:bg-slate-100"
            >
              {c.cancel}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? c.saving : c.save}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BookingAccounts({
  accounts,
  onChange,
  onError,
}: {
  accounts: BookingAccount[];
  onChange: (accounts: BookingAccount[]) => void;
  onError: (message: string | null) => void;
}) {
  const c = useT().accounting;
  const [draft, setDraft] = useState({ displayName: "", name: "", skrAccount: "" });
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!draft.displayName.trim()) {
      onError(c.displayNameRequired);
      return;
    }
    setSaving(true);
    onError(null);
    try {
      const created = await createBookingAccount({
        displayName: draft.displayName.trim(),
        name: draft.name.trim() || null,
        skrAccount: draft.skrAccount.trim() || null,
      });
      onChange([...accounts, created]);
      setDraft({ displayName: "", name: "", skrAccount: "" });
    } catch (err) {
      onError(err instanceof ApiError ? err.message : c.accountAddError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(account: BookingAccount) {
    const previous = accounts;
    onChange(accounts.filter((a) => a.id !== account.id));
    try {
      await deleteBookingAccount(account.id);
    } catch (err) {
      onChange(previous);
      onError(err instanceof ApiError ? err.message : c.accountRemoveError);
    }
  }

  return (
    <div>
      <SimpleTable
        headers={[c.colDisplayName, c.colName, c.colSkr, ""]}
        empty={c.accountsEmpty}
        rows={accounts.map((account) => [
          <span key="d" className="font-medium text-foreground">{account.displayName}</span>,
          <span key="n" className="text-muted">{account.name || "—"}</span>,
          <span key="s" className="tabular-nums text-muted">{account.skrAccount || "—"}</span>,
          <RemoveButton key="r" label={account.displayName} onClick={() => remove(account)} />,
        ])}
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_10rem_auto]">
        <input
          value={draft.displayName}
          onChange={(event) => setDraft({ ...draft, displayName: event.target.value })}
          placeholder={c.phDisplayName}
          aria-label={c.colDisplayName}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder={c.phAccountName}
          aria-label={c.colName}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <input
          value={draft.skrAccount}
          onChange={(event) => setDraft({ ...draft, skrAccount: event.target.value })}
          placeholder={c.phSkr}
          aria-label={c.colSkr}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          disabled={saving}
          onClick={add}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-60"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function CostCenters({
  centers,
  onChange,
  onError,
}: {
  centers: CostCenter[];
  onChange: (centers: CostCenter[]) => void;
  onError: (message: string | null) => void;
}) {
  const c = useT().accounting;
  const [draft, setDraft] = useState({ name: "", number: "" });
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!draft.name.trim()) {
      onError(c.centreNameRequired);
      return;
    }
    setSaving(true);
    onError(null);
    try {
      const created = await createCostCenter({
        name: draft.name.trim(),
        number: draft.number.trim() || null,
      });
      onChange([...centers, created]);
      setDraft({ name: "", number: "" });
    } catch (err) {
      onError(err instanceof ApiError ? err.message : c.centreAddError);
    } finally {
      setSaving(false);
    }
  }

  async function remove(center: CostCenter) {
    const previous = centers;
    onChange(centers.filter((c) => c.id !== center.id));
    try {
      await deleteCostCenter(center.id);
    } catch (err) {
      onChange(previous);
      onError(err instanceof ApiError ? err.message : c.centreRemoveError);
    }
  }

  return (
    <div>
      <SimpleTable
        headers={[c.colCentreName, c.colCentreNumber, ""]}
        empty={c.centresEmpty}
        rows={centers.map((center) => [
          <span key="n" className="font-medium text-foreground">{center.name}</span>,
          <span key="no" className="tabular-nums text-muted">{center.number || "—"}</span>,
          <RemoveButton key="r" label={center.name} onClick={() => remove(center)} />,
        ])}
      />

      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
        <input
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder={c.phCentreName}
          aria-label={c.ariaCentreName}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <input
          value={draft.number}
          onChange={(event) => setDraft({ ...draft, number: event.target.value })}
          placeholder={c.phCentreNumber}
          aria-label={c.ariaCentreNumber}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="button"
          disabled={saving}
          onClick={add}
          className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-60"
        >
          Add
        </button>
      </div>
    </div>
  );
}

/**
 * The payment methods an invoice can carry.
 *
 * <p>Read-only: these are the values of a database enum that the invoice and payment tables both
 * reference, so this lists what exists rather than pretending they can be edited.
 */
function PaymentMethods() {
  const c = useT().accounting;
  // The stored enum values; their wording comes from the dictionary.
  const methods = ["bank_transfer", "cash", "card", "paypal", "stripe", "other"] as const;

  return (
    <div>
      <SimpleTable
        headers={[c.colName, c.colStoredAs, c.colNotes]}
        empty=""
        rows={methods.map((value) => [
          <span key="l" className="font-medium text-foreground">{c.methods[value].label}</span>,
          <code key="v" className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-muted">{value}</code>,
          <span key="n" className="text-muted">{c.methods[value].note || "—"}</span>,
        ])}
      />
      <p className="mt-4 text-sm text-muted">
        {c.methodsNote}
      </p>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
  empty,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {headers.map((header, i) => (
              <th
                key={i}
                scope="col"
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-3 py-10 text-center text-sm text-muted">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((cells, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {cells.map((cell, j) => (
                  <td key={j} className={cn("px-3 py-3", j === cells.length - 1 && "text-right")}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  const c = useT().accounting;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={format(c.removeAria, { label })}
      className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
    >
      {c.remove}
    </button>
  );
}
