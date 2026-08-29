"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { getClient } from "@/lib/api/clients";
import {
  cancelDeliveryNote,
  getDeliveryNote,
  markDeliveryNoteDelivered,
  markDeliveryNoteSent,
} from "@/lib/api/delivery-notes";
import type { Client, DeliveryNote } from "@/types/api";
import { StatusPill } from "@/components/layout/page-shell";
import { formatDate, formatMoney, humanizeStatus } from "@/lib/utils/format";

export default function DeliveryNoteDetailPage() {
  const params = useParams<{ deliveryNoteId: string }>();
  const id = params.deliveryNoteId;

  const [loaded, setLoaded] = useState<{ id: string; note: DeliveryNote } | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [failed, setFailed] = useState<{ id: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const note = loaded?.id === id ? loaded.note : null;
  const error = failed?.id === id ? failed.message : null;

  useEffect(() => {
    let cancelled = false;
    getDeliveryNote(id)
      .then(async (found) => {
        if (cancelled) return;
        setLoaded({ id, note: found });
        // Best-effort: the note stands on its own if the contact cannot be read.
        try {
          const contact = await getClient(found.clientId);
          if (!cancelled) setClient(contact);
        } catch {
          /* leave the contact unnamed */
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailed({
          id,
          message: err instanceof ApiError ? err.message : "Failed to load this delivery note",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function act(action: (id: string) => Promise<DeliveryNote>, failure: string) {
    setBusy(true);
    try {
      const saved = await action(id);
      setLoaded({ id, note: saved });
    } catch (err) {
      setFailed({ id, message: err instanceof ApiError ? err.message : failure });
    } finally {
      setBusy(false);
    }
  }

  if (!note) {
    return (
      <div className="rounded-xl border border-border bg-card p-16 text-center shadow-sm">
        <p className="text-sm font-medium text-foreground">
          {error ? "This delivery note could not be loaded" : "Loading delivery note…"}
        </p>
        {error ? <p className="mt-1 text-sm text-muted">{error}</p> : null}
        <Link
          href="/orders/delivery-notes"
          className="mt-4 inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-slate-50"
        >
          Back to delivery notes
        </Link>
      </div>
    );
  }

  const net = Number(note.subtotalAmount) - Number(note.discountAmount);
  const addressLines = [
    note.deliveryAddressLine1,
    note.deliveryAddressLine2,
    [note.deliveryPostalCode, note.deliveryCity].filter(Boolean).join(" "),
    note.deliveryCountryCode,
  ].filter((line): line is string => Boolean(line && line.trim()));

  return (
    <div className="space-y-6">
      <Link
        href="/orders/delivery-notes"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" />
        Delivery notes
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {note.deliveryNoteNumber}
            </h1>
            <StatusPill status={humanizeStatus(note.status)} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {note.subject || "Delivery note"} · delivered {formatDate(note.deliveryDate)}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {note.status === "draft" ? (
            <ActionButton
              disabled={busy}
              onClick={() => act(markDeliveryNoteSent, "Could not mark this note as sent")}
            >
              Mark as sent
            </ActionButton>
          ) : null}
          {note.status !== "delivered" && note.status !== "cancelled" ? (
            <ActionButton
              primary
              disabled={busy}
              onClick={() => act(markDeliveryNoteDelivered, "Could not mark this note delivered")}
            >
              Mark as delivered
            </ActionButton>
          ) : null}
          {note.status !== "cancelled" ? (
            <ActionButton
              disabled={busy}
              onClick={() => act(cancelDeliveryNote, "Could not cancel this note")}
            >
              Cancel
            </ActionButton>
          ) : null}
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
          {note.headerText ? (
            <p className="whitespace-pre-wrap border-b border-border px-5 py-4 text-sm text-foreground">
              {note.headerText}
            </p>
          ) : null}

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/70">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">
                  Item
                </th>
                <th className="w-24 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Qty
                </th>
                <th className="w-32 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Price
                </th>
                <th className="w-32 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {note.items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 text-foreground">{item.description}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {item.quantity} {item.unit ?? ""}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">
                    {formatMoney(item.unitPrice, note.currency)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-foreground">
                    {formatMoney(item.lineTotal, note.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-border px-5 py-4">
            <div className="ml-auto max-w-xs space-y-1.5 text-sm">
              <Row label="Net" value={formatMoney(net, note.currency)} />
              {Number(note.discountAmount) > 0 ? (
                <Row
                  label="Discount"
                  value={`− ${formatMoney(note.discountAmount, note.currency)}`}
                />
              ) : null}
              <Row label="VAT" value={formatMoney(note.taxAmount, note.currency)} />
              <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                <span className="text-foreground">Total</span>
                <span className="tabular-nums text-foreground">
                  {formatMoney(note.totalAmount, note.currency)}
                </span>
              </div>
            </div>
          </div>

          {note.footerText ? (
            <p className="whitespace-pre-wrap border-t border-border px-5 py-4 text-sm text-muted">
              {note.footerText}
            </p>
          ) : null}
        </section>

        <aside className="space-y-6">
          <Card title="Customer">
            {client ? (
              <Link
                href={`/clients/${note.clientId}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {client.name}
              </Link>
            ) : (
              <p className="text-sm text-muted">Contact unavailable</p>
            )}
          </Card>

          <Card title="Delivered to">
            {addressLines.length > 0 ? (
              <address className="text-sm not-italic leading-relaxed text-foreground">
                {addressLines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            ) : (
              <p className="text-sm text-muted">No delivery address recorded.</p>
            )}
          </Card>

          <Card title="Details">
            <Row label="Delivery date" value={formatDate(note.deliveryDate)} />
            <Row label="Reference" value={note.reference ?? "—"} />
            <Row label="Sent" value={note.sentAt ? formatDate(note.sentAt) : "—"} />
            <Row label="Delivered" value={note.deliveredAt ? formatDate(note.deliveredAt) : "—"} />
          </Card>

          <p className="px-1 text-xs text-muted">
            A delivery note is not an invoice. Nothing is owed because this exists, and it does not
            become a bill.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={
        primary
          ? "inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-blue-700 disabled:opacity-50"
          : "inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 disabled:opacity-50"
      }
    >
      {children}
    </button>
  );
}

const ChevronLeftIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m14 6-6 6 6 6" />
  </svg>
);
