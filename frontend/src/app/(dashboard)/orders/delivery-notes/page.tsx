"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { listClients } from "@/lib/api/dashboard";
import {
  cancelDeliveryNote,
  listDeliveryNotes,
  markDeliveryNoteDelivered,
  markDeliveryNoteSent,
} from "@/lib/api/delivery-notes";
import type { Client, DeliveryNote } from "@/types/api";
import { StatusPill } from "@/components/layout/page-shell";
import { formatDate, formatMoney, humanizeStatus } from "@/lib/utils/format";
import { useT } from "@/components/providers/locale-provider";
import { format } from "@/lib/i18n/format";
import { cn } from "@/lib/utils/cn";

/** Filter keys. These are the stored statuses, so the comparison no longer goes through
 *  the visible label -- which changes with the language. */
const TABS = ["all", "draft", "sent", "delivered", "cancelled"] as const;
type Tab = (typeof TABS)[number];

const PAGE_SIZES = [25, 50, 100];

function matchesTab(note: DeliveryNote, tab: Tab) {
  if (tab === "all") return true;
  return note.status === tab;
}

/** Net is what was delivered before VAT: the line totals less any document discount. */
function netOf(note: DeliveryNote) {
  return Number(note.subtotalAmount) - Number(note.discountAmount);
}

function subjectOf(note: DeliveryNote) {
  if (note.subject && note.subject.trim()) return note.subject.trim();
  const first = note.items?.[0]?.description?.trim();
  return first && first.length > 0 ? first : `Delivery note ${note.deliveryNoteNumber}`;
}

export default function DeliveryNotesPage() {
  const t = useT();
  const c = t.deliveryNotes;
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listDeliveryNotes(), listClients()])
      .then(([noteList, clientList]) => {
        if (cancelled) return;
        setNotes(noteList);
        setClients(clientList);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : c.loadError);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // The dictionary is only read for the failure message; re-running on a language switch
    // would refetch every note for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientName = useMemo(() => {
    const byId = new Map(clients.map((client) => [client.id, client.name]));
    return (id: string) => byId.get(id) ?? c.unknownContact;
  }, [clients, c.unknownContact]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return notes
      .filter((note) => matchesTab(note, tab))
      .filter((note) =>
        !needle
          ? true
          : [note.deliveryNoteNumber, clientName(note.clientId), subjectOf(note)]
              .some((field) => field.toLowerCase().includes(needle)),
      );
  }, [notes, tab, query, clientName]);

  const counts = useMemo(() => {
    const result = {} as Record<Tab, number>;
    for (const label of TABS) {
      result[label] = notes.filter((note) => matchesTab(note, label)).length;
    }
    return result;
  }, [notes]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  const firstRow = filtered.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastRow = Math.min(current * pageSize, filtered.length);

  async function act(
    note: DeliveryNote,
    action: (id: string) => Promise<DeliveryNote>,
    failure: string,
  ) {
    setMenu(null);
    setBusy(note.id);
    try {
      const saved = await action(note.id);
      setNotes((list) => list.map((n) => (n.id === saved.id ? saved : n)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : failure);
    } finally {
      setBusy(null);
    }
  }

  // The first-run screen: a delivery note is not self-explanatory, so the empty state says what
  // one is for rather than just reporting that there are none.
  if (!loading && notes.length === 0 && !error) {
    return <FirstRun />;
  }

  return (
    <div className="space-y-6" onClick={() => setMenu(null)}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{c.title}</h1>
          {!loading ? (
            <p className="mt-1 text-sm font-medium text-foreground">
              {format(notes.length === 1 ? c.countOne : c.countOther, {
                count: notes.length,
              })}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted">{c.description}</p>
        </div>

        <Link
          href="/orders/delivery-notes/new"
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
              className="h-9 w-64 rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/70">
                <Th className="w-36">{c.colStatus}</Th>
                <Th className="w-32">{c.colNumber}</Th>
                <Th>{c.colCustomer}</Th>
                <Th className="w-36">{c.colDeliveryDate}</Th>
                <Th className="w-36 text-right">{c.colAmountNet}</Th>
                <Th className="w-16 text-right">{c.colActions}</Th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-foreground">
                      {loading ? c.loadingTitle : c.filteredTitle}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {loading ? c.loadingHint : c.filteredHint}
                    </p>
                  </td>
                </tr>
              ) : (
                visible.map((note) => (
                  <tr
                    key={note.id}
                    className={cn(
                      "border-b border-border last:border-0 hover:bg-slate-50/70",
                      busy === note.id && "opacity-50",
                    )}
                  >
                    <td className="px-4 py-3">
                      <StatusPill status={humanizeStatus(note.status)} />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/delivery-notes/${note.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {note.deliveryNoteNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${note.clientId}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {clientName(note.clientId)}
                      </Link>
                      <span className="block truncate text-xs text-muted">{subjectOf(note)}</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(note.deliveryDate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {formatMoney(netOf(note), note.currency)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        aria-label={`Options for ${note.deliveryNoteNumber}`}
                        aria-expanded={menu?.id === note.id}
                        disabled={busy === note.id}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (menu?.id === note.id) {
                            setMenu(null);
                            return;
                          }
                          const box = event.currentTarget.getBoundingClientRect();
                          setMenu({
                            id: note.id,
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
                ))
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

      {menu
        ? createPortal(
            (() => {
              const note = notes.find((n) => n.id === menu.id);
              if (!note) return null;
              return (
                <div
                  role="menu"
                  onClick={(event) => event.stopPropagation()}
                  style={{ top: menu.top, right: menu.right }}
                  className="fixed z-50 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 text-left shadow-lg"
                >
                  <Link
                    href={`/orders/delivery-notes/${note.id}`}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-slate-50"
                  >
                    {c.view}
                  </Link>
                  {/* Only transitions the server accepts are offered. */}
                  {note.status === "draft" ? (
                    <MenuButton
                      onClick={() =>
                        act(note, markDeliveryNoteSent, c.markSentError)
                      }
                    >
                      {c.markSent}
                    </MenuButton>
                  ) : null}
                  {note.status !== "delivered" && note.status !== "cancelled" ? (
                    <MenuButton
                      onClick={() =>
                        act(note, markDeliveryNoteDelivered, c.markDeliveredError)
                      }
                    >
                      {c.markDelivered}
                    </MenuButton>
                  ) : null}
                  {note.status !== "cancelled" ? (
                    <MenuButton
                      tone="danger"
                      onClick={() => act(note, cancelDeliveryNote, c.cancelError)}
                    >
                      {c.cancelNote}
                    </MenuButton>
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

/** Shown until the first delivery note exists. */
function FirstRun() {
  const c = useT().deliveryNotes;
  return (
    <div className="mx-auto max-w-3xl py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {c.firstRunTitle}
      </h1>

      <ul className="mt-8 flex flex-wrap items-start justify-center gap-x-8 gap-y-3 text-sm text-foreground">
        <Benefit>{c.benefit1}</Benefit>
        <Benefit>{c.benefit2}</Benefit>
        <Benefit>{c.benefit3}</Benefit>
      </ul>

      <Link
        href="/orders/delivery-notes/new"
        className="mt-10 inline-flex h-11 items-center rounded-lg bg-slate-800 px-6 text-sm font-medium text-white transition-colors hover:bg-slate-900"
      >
        {c.create}
      </Link>

      <p className="mx-auto mt-10 max-w-xl border-t border-border pt-6 text-sm text-muted">
        {c.firstRunNote}
      </p>
    </div>
  );
}

function Benefit({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <CheckIcon className="size-5 shrink-0 text-emerald-500" />
      {children}
    </li>
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
const CheckIcon = icon(<path d="m4 12 5 5L20 6" />);
