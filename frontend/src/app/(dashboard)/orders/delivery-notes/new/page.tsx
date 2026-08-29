"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { listClients } from "@/lib/api/dashboard";
import {
  createDeliveryNote,
  markDeliveryNoteSent,
  peekNextDeliveryNoteNumber,
  type DeliveryNoteItemInput,
} from "@/lib/api/delivery-notes";
import type { Client } from "@/types/api";
import { formatMoney } from "@/lib/utils/format";

/** The VAT rates a German document realistically uses. */
const TAX_RATES = [19, 7, 0];

const UNITS = ["pcs", "hour", "day", "sqm", "meter", "kg", "tonne", "litre", "lump_sum"];

type Line = {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  taxRate: string;
  discountAmount: string;
};

const EMPTY_LINE: Line = {
  description: "",
  quantity: "1",
  unit: "pcs",
  unitPrice: "0",
  taxRate: "19",
  discountAmount: "0",
};

/** Parses a form field that may be blank or half-typed, without letting NaN reach the totals. */
function num(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function lineNet(line: Line) {
  return num(line.quantity) * num(line.unitPrice) - num(line.discountAmount);
}

export default function NewDeliveryNotePage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [nextNumber, setNextNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [clientId, setClientId] = useState("");
  const [subject, setSubject] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [documentDiscount, setDocumentDiscount] = useState("0");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);

  // Blank until the operator edits it, at which point it stops following the contact. Copying the
  // contact's address on every render would silently overwrite a site address they had typed.
  const [addressTouched, setAddressTouched] = useState(false);
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    postalCode: "",
    city: "",
    countryCode: "DE",
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([listClients(), peekNextDeliveryNoteNumber().catch(() => null)])
      .then(([clientList, preview]) => {
        if (cancelled) return;
        setClients(clientList);
        setNextNumber(preview);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load contacts");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const client = clients.find((c) => c.id === clientId) ?? null;

  // What the delivery address will actually be: the site address if one was typed, otherwise the
  // contact's own, which is what the server would fall back to anyway.
  const effectiveAddress = addressTouched
    ? address
    : {
        line1: client?.addressLine1 ?? "",
        line2: client?.addressLine2 ?? "",
        postalCode: client?.postalCode ?? "",
        city: client?.city ?? "",
        countryCode: client?.countryCode ?? "DE",
      };

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + lineNet(line), 0);
    const discount = Math.min(num(documentDiscount), subtotal);
    // Mirrors the server: the document discount is spread across lines by their share, then each
    // line is taxed at its own rate. Same shape, so the preview matches what gets saved.
    const tax = subtotal === 0
      ? 0
      : lines.reduce((sum, line) => {
          const net = lineNet(line);
          const share = discount * (net / subtotal);
          return sum + ((net - share) * num(line.taxRate)) / 100;
        }, 0);
    return { subtotal, discount, tax, total: subtotal - discount + tax };
  }, [lines, documentDiscount]);

  // Display only. The server stamps the company default on save, which is the value that
  // actually ends up on the document.
  const currency = "EUR";
  const canSave = clientId !== "" && lines.some((line) => line.description.trim() !== "");

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function buildInput() {
    const items: DeliveryNoteItemInput[] = lines
      .filter((line) => line.description.trim() !== "")
      .map((line) => ({
        description: line.description.trim(),
        quantity: num(line.quantity) || 1,
        unit: line.unit,
        unitPrice: num(line.unitPrice),
        taxRate: num(line.taxRate),
        discountAmount: num(line.discountAmount),
      }));

    return {
      clientId,
      subject: subject.trim() || null,
      deliveryDate,
      reference: reference.trim() || null,
      headerText: headerText.trim() || null,
      footerText: footerText.trim() || null,
      discountAmount: num(documentDiscount),
      // Only sent when edited. Leaving them null lets the server copy the contact's address, so
      // the fallback lives in one place rather than two.
      deliveryAddressLine1: addressTouched ? address.line1 || null : null,
      deliveryAddressLine2: addressTouched ? address.line2 || null : null,
      deliveryPostalCode: addressTouched ? address.postalCode || null : null,
      deliveryCity: addressTouched ? address.city || null : null,
      deliveryCountryCode: addressTouched ? address.countryCode || null : null,
      items,
    };
  }

  async function save(thenSend: boolean) {
    setSaving(true);
    setError(null);
    try {
      const created = await createDeliveryNote(buildInput());
      if (thenSend) {
        await markDeliveryNoteSent(created.id);
      }
      router.push("/orders/delivery-notes");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this delivery note");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/orders/delivery-notes"
            className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
            Delivery notes
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
            New delivery note
          </h1>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => save(false)}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save as draft"}
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => save(true)}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save and mark sent
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Could not save</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      ) : null}

      <Section title="Contact and delivery information">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Customer" required>
              <select
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              >
                <option value="">Select a contact…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Delivery address"
              hint={
                addressTouched
                  ? "Using the address typed here"
                  : "Taken from the contact. Edit to deliver somewhere else, such as a site."
              }
            >
              <div className="space-y-2">
                <input
                  value={effectiveAddress.line1}
                  onChange={(event) => {
                    setAddressTouched(true);
                    setAddress({ ...effectiveAddress, line1: event.target.value });
                  }}
                  placeholder="Street and number"
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
                <div className="flex gap-2">
                  <input
                    value={effectiveAddress.postalCode}
                    onChange={(event) => {
                      setAddressTouched(true);
                      setAddress({ ...effectiveAddress, postalCode: event.target.value });
                    }}
                    placeholder="Postcode"
                    className="h-10 w-32 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                  <input
                    value={effectiveAddress.city}
                    onChange={(event) => {
                      setAddressTouched(true);
                      setAddress({ ...effectiveAddress, city: event.target.value });
                    }}
                    placeholder="City"
                    className="h-10 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                  />
                </div>
                {addressTouched ? (
                  <button
                    type="button"
                    onClick={() => setAddressTouched(false)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Use the contact&apos;s address
                  </button>
                ) : null}
              </div>
            </Field>
          </div>

          <div className="space-y-4">
            <Field label="Subject">
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder={nextNumber ? `Delivery note ${nextNumber}` : "Delivery note"}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Number" hint="Assigned when you save">
                <input
                  value={nextNumber ?? "—"}
                  readOnly
                  aria-readonly
                  className="h-10 w-full cursor-not-allowed rounded-lg border border-border bg-slate-50 px-3 text-sm text-muted outline-none"
                />
              </Field>
              <Field label="Delivery date">
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                  className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
                />
              </Field>
            </div>

            <Field label="Reference / order number">
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary"
              />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Header text">
        <textarea
          value={headerText}
          onChange={(event) => setHeaderText(event.target.value)}
          rows={3}
          placeholder="Shown above the lines on the printed note."
          className="w-full rounded-lg border border-border bg-card p-3 text-sm outline-none focus:border-primary"
        />
      </Section>

      <Section title="Items">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8 pb-2 text-left text-xs font-semibold uppercase text-muted">#</th>
                <th className="pb-2 text-left text-xs font-semibold uppercase text-muted">Item or service</th>
                <th className="w-24 pb-2 text-left text-xs font-semibold uppercase text-muted">Qty</th>
                <th className="w-28 pb-2 text-left text-xs font-semibold uppercase text-muted">Unit</th>
                <th className="w-32 pb-2 text-left text-xs font-semibold uppercase text-muted">Price (net)</th>
                <th className="w-24 pb-2 text-left text-xs font-semibold uppercase text-muted">VAT</th>
                <th className="w-28 pb-2 text-right text-xs font-semibold uppercase text-muted">Amount</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="border-b border-border last:border-0">
                  <td className="py-2 pr-2 text-sm text-muted">{index + 1}.</td>
                  <td className="py-2 pr-2">
                    <input
                      value={line.description}
                      onChange={(event) => updateLine(index, { description: event.target.value })}
                      placeholder="What was delivered"
                      className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={line.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                      inputMode="decimal"
                      className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={line.unit}
                      onChange={(event) => updateLine(index, { unit: event.target.value })}
                      className="h-9 w-full rounded-lg border border-border bg-card px-1 text-sm outline-none focus:border-primary"
                    >
                      {UNITS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      value={line.unitPrice}
                      onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                      inputMode="decimal"
                      className="h-9 w-full rounded-lg border border-border bg-card px-2 text-right text-sm outline-none focus:border-primary"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      value={line.taxRate}
                      onChange={(event) => updateLine(index, { taxRate: event.target.value })}
                      className="h-9 w-full rounded-lg border border-border bg-card px-1 text-sm outline-none focus:border-primary"
                    >
                      {TAX_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}%
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-foreground">
                    {formatMoney(lineNet(line), currency)}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      aria-label={`Remove line ${index + 1}`}
                      // The last line is kept: a note with no lines cannot be saved anyway, and an
                      // empty table gives nowhere to start typing again.
                      disabled={lines.length === 1}
                      onClick={() => setLines((c) => c.filter((_, i) => i !== index))}
                      className="rounded-md p-1.5 text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setLines((c) => [...c, { ...EMPTY_LINE }])}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          + Add line
        </button>
      </Section>

      <Section title="Footer text">
        <textarea
          value={footerText}
          onChange={(event) => setFooterText(event.target.value)}
          rows={3}
          placeholder="Shown below the lines, e.g. who signed for the delivery."
          className="w-full rounded-lg border border-border bg-card p-3 text-sm outline-none focus:border-primary"
        />
      </Section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="ml-auto max-w-sm space-y-2 text-sm">
          <TotalRow label="Net total" value={formatMoney(totals.subtotal, currency)} />
          <div className="flex items-center justify-between gap-4">
            <label className="text-muted" htmlFor="doc-discount">
              Discount
            </label>
            <input
              id="doc-discount"
              value={documentDiscount}
              onChange={(event) => setDocumentDiscount(event.target.value)}
              inputMode="decimal"
              className="h-9 w-28 rounded-lg border border-border bg-card px-2 text-right text-sm outline-none focus:border-primary"
            />
          </div>
          <TotalRow label="VAT" value={formatMoney(totals.tax, currency)} />
          <div className="flex items-center justify-between gap-4 border-t border-border pt-2 text-base font-semibold">
            <span className="text-foreground">Total</span>
            <span className="tabular-nums text-foreground">
              {formatMoney(totals.total, currency)}
            </span>
          </div>
          <p className="pt-2 text-xs text-muted">
            Amounts describe what was delivered. A delivery note is not an invoice — nothing is
            owed because you issued one.
          </p>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
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
const ChevronLeftIcon = icon(<path d="m14 6-6 6 6 6" />);
const TrashIcon = icon(<><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></>);
