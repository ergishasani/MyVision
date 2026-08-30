"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useT } from "@/components/providers/locale-provider";
import { format } from "@/lib/i18n/format";
import { ApiError } from "@/lib/api/client";
import { archiveClient, deleteClient, listClients } from "@/lib/api/clients";
import type { Client } from "@/types/api";
import { ClientDialog } from "@/components/clients/client-dialog";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

/** Filter keys, deliberately not the visible labels — those change with the language. */
const TABS = ["all", "organisations", "people"] as const;
type Tab = (typeof TABS)[number];

const PAGE_SIZES = [25, 50, 100];

function matchesTab(client: Client, tab: Tab) {
  if (tab === "all") return true;
  return tab === "organisations" ? client.type === "business" : client.type === "individual";
}

function location(client: Client) {
  const parts = [client.postalCode, client.city].filter(Boolean).join(" ");
  if (client.countryCode && parts) return `${client.countryCode}-${parts}`;
  return parts || client.countryCode || "—";
}

export default function ClientsPage() {
  const t = useT();
  const c = t.clients;
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // The open menu, with the anchor it hangs from. Held here because the menu renders in a portal.
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Client | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Client | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // /clients/<id>/edit redirects here with ?edit=<id>, so an edit link still opens the form.
  //
  // Derived from the row rather than copied into state: an effect that mirrored the list into a
  // second copy would go stale the moment the contact was saved, and the dialog would keep showing
  // the values it opened with.
  const editParam = searchParams.get("edit");
  const editing = clients.find((c) => c.id === (editingId ?? editParam)) ?? null;

  useEffect(() => {
    listClients()
      .then(setClients)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : c.loadError),
      )
      .finally(() => setLoading(false));
    // The dictionary is only read for the failure message; re-running on a language switch
    // would refetch every contact for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients
      .filter((client) => matchesTab(client, tab))
      .filter((client) =>
        !q
          ? true
          : [client.name, client.email, client.city, client.contactName, client.vatNumber]
              .filter(Boolean)
              .some((field) => field!.toLowerCase().includes(q)),
      );
  }, [clients, tab, query]);

  const counts = useMemo(() => {
    const result = {} as Record<Tab, number>;
    for (const label of TABS) {
      result[label] = clients.filter((client) => matchesTab(client, label)).length;
    }
    return result;
  }, [clients]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  const firstRow = filtered.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastRow = Math.min(current * pageSize, filtered.length);

  async function handleArchive(client: Client) {
    setConfirmArchive(null);
    setMenu(null);
    // Optimistic: the row disappears at once and comes back if the API refuses.
    const previous = clients;
    setClients((list) => list.filter((c) => c.id !== client.id));
    try {
      await archiveClient(client.id);
    } catch (err) {
      setClients(previous);
      setError(err instanceof ApiError ? err.message : c.archiveError);
    }
  }

  async function handleDelete(client: Client) {
    setConfirmDelete(null);
    setMenu(null);
    // Not optimistic. A delete is refused whenever a document references the contact, and that
    // refusal is the common case — removing the row first would flash it away and put it back.
    try {
      await deleteClient(client.id);
      setClients((list) => list.filter((c) => c.id !== client.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : c.deleteError);
    }
  }

  function closeEditor() {
    setEditingId(null);
    // Drop ?edit= so a refresh does not reopen the form that was just closed.
    if (editParam) router.replace("/clients");
  }

  return (
    <div className="space-y-6" onClick={() => setMenu(null)}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{c.title}</h1>
          {!loading ? (
            <p className="mt-1 text-sm font-medium text-foreground">
              {format(clients.length === 1 ? c.countOne : c.countOther, {
                count: clients.length,
              })}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted">{c.description}</p>
        </div>

        <div className="flex shrink-0 gap-2">
          <Link
            href="/clients/new"
            className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
          >
            {c.importContacts}
          </Link>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-blue-700"
          >
            <PlusIcon className="size-4" />
            {c.createContact}
          </button>
        </div>
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

          {/* sevdesk hides filtering behind a modal; a live box is faster for the common case. */}
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
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/70">
                <th scope="col" className="w-14 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  {c.columns.type}
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.columns.name}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.columns.contact}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.columns.location}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.columns.added}</th>
                <th scope="col" className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">{c.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16">
                    <div className="mx-auto max-w-sm text-center">
                      <div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100">
                        <UsersIcon className="size-5 text-muted" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {loading
                          ? c.loadingTitle
                          : clients.length === 0
                            ? c.emptyTitle
                            : c.filteredTitle}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {loading
                          ? c.loadingHint
                          : clients.length === 0
                            ? c.emptyHint
                            : c.filteredHint}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((client) => (
                  <tr key={client.id} className="group border-b border-border last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <span
                        title={client.type === "business" ? c.typeOrganisation : c.typePerson}
                        className="grid size-8 place-items-center rounded-lg bg-slate-100 text-muted"
                      >
                        {client.type === "business" ? (
                          <BuildingIcon className="size-4" />
                        ) : (
                          <PersonIcon className="size-4" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                        {client.name}
                      </Link>
                      {client.contactName ? (
                        <span className="block text-xs text-muted">{client.contactName}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {client.email ? <span className="block text-foreground">{client.email}</span> : null}
                      {client.phone ? <span className="block text-xs">{client.phone}</span> : null}
                      {!client.email && !client.phone ? "—" : null}
                    </td>
                    <td className="px-4 py-3 text-muted">{location(client)}</td>
                    <td className="px-4 py-3 text-muted">{formatDate(client.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {/* Kept always visible rather than hover-only: hover-only controls are
                          unreachable by keyboard and on touch. */}
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${client.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenu(null);
                            setEditingId(client.id);
                          }}
                          className="rounded-md p-1.5 text-muted transition-colors hover:bg-slate-200 hover:text-foreground"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Options for ${client.name}`}
                          aria-expanded={menu?.id === client.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (menu?.id === client.id) {
                              setMenu(null);
                              return;
                            }
                            // The menu is positioned from the button's own box because it renders
                            // in a portal on document.body, outside this scrolling table.
                            const box = event.currentTarget.getBoundingClientRect();
                            setMenu({
                              id: client.id,
                              top: box.bottom + 6,
                              right: window.innerWidth - box.right,
                            });
                          }}
                          className="rounded-md p-1.5 text-muted transition-colors hover:bg-slate-200 hover:text-foreground"
                        >
                          <DotsIcon className="size-4" />
                        </button>
                      </div>
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
                : format(c.showing, {
                    first: firstRow,
                    last: lastRow,
                    total: filtered.length,
                  })}
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

      {/* Rendered on document.body so the horizontally scrolling table cannot clip it — that is
          what cut the menu off against the table's edge before. */}
      {menu
        ? createPortal(
            (() => {
              const client = clients.find((c) => c.id === menu.id);
              if (!client) return null;
              return (
                <div
                  role="menu"
                  onClick={(event) => event.stopPropagation()}
                  style={{ top: menu.top, right: menu.right }}
                  className="fixed z-50 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 text-left shadow-lg"
                >
                  <Link
                    href={`/clients/${client.id}`}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-slate-50"
                  >
                    View details
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(null);
                      setEditingId(client.id);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-slate-50"
                  >
                    Edit contact
                  </button>
                  <Link
                    href={`/invoices/new?clientId=${client.id}`}
                    className="block px-4 py-2 text-sm text-foreground hover:bg-slate-50"
                  >
                    New invoice
                  </Link>
                  <button
                    type="button"
                    onClick={() => setConfirmArchive(client)}
                    className="mt-1 block w-full border-t border-border px-4 py-2 text-left text-sm text-foreground hover:bg-slate-50"
                  >
                    Archive contact
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(client)}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete contact
                  </button>
                </div>
              );
            })(),
            document.body,
          )
        : null}

      <ClientDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(client) => setClients((list) => [client, ...list])}
      />

      <ClientDialog
        // Keyed on the contact so opening a different one remounts the form with its values,
        // rather than leaving the previous contact's data in the fields.
        key={editing?.id ?? "none"}
        open={editing !== null}
        client={editing}
        onClose={closeEditor}
        onCreated={(saved) => {
          setClients((list) => list.map((c) => (c.id === saved.id ? saved : c)));
          closeEditor();
        }}
      />

      {confirmArchive ? (
        <ConfirmDialog
          title={c.archive.title}
          confirmLabel={c.archive.confirm}
          tone="neutral"
          onCancel={() => setConfirmArchive(null)}
          onConfirm={() => handleArchive(confirmArchive)}
        >
          <NamedSentence template={c.archive.body} name={confirmArchive.name} />
        </ConfirmDialog>
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          title={c.delete.title}
          confirmLabel={c.delete.confirm}
          tone="danger"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        >
          <NamedSentence template={c.delete.body} name={confirmDelete.name} />
          {/* Said up front rather than after the attempt fails, since it is the usual outcome. */}
          <span className="mt-3 block">{c.delete.refusal}</span>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}

/**
 * A sentence with the contact's name emphasised inside it.
 *
 * <p>Split at the placeholder rather than concatenated around it: German puts the name and the
 * verb in a different order, so "{name} is hidden from the list" and "{name} wird aus der Liste
 * ausgeblendet" only agree if each language owns the whole sentence.
 */
function NamedSentence({ template, name }: { template: string; name: string }) {
  const [before, after] = template.split("{name}");
  return (
    <>
      {before}
      <span className="font-medium text-foreground">{name}</span>
      {after}
    </>
  );
}

/** Confirmation for an action that cannot simply be undone by clicking again. */
function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  tone: "neutral" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const t = useT();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={t.common.cancel}
        onClick={onCancel}
        className="fixed inset-0 cursor-default bg-slate-900/40"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted">{children}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg px-4 text-sm font-medium text-foreground hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "h-10 rounded-lg px-4 text-sm font-medium text-white",
              tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-slate-800 hover:bg-slate-900",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
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
const PencilIcon = icon(<><path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5Z" /><path d="m13.5 6.5 4 4" /></>);
const DotsIcon = icon(<><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></>);
const PersonIcon = icon(<><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" /></>);
const BuildingIcon = icon(<><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" /><path d="M15 10h4a1 1 0 0 1 1 1v10" /><path d="M7 8h4M7 12h4M7 16h4" /><path d="M3 21h18" /></>);
const UsersIcon = icon(<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M17 11a3 3 0 1 0-1.5-5.6" /></>);
