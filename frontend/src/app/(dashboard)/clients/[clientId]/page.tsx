"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { getClientOverview } from "@/lib/api/clients";
import type {
  Client,
  ClientInvoiceSummary,
  ClientOverview,
  ClientQuoteSummary,
  ClientStats,
  ContactDetail,
  Project,
} from "@/types/api";
import { ClientDialog } from "@/components/clients/client-dialog";
import { StatusPill } from "@/components/layout/page-shell";
import { daysOverdue, formatDate, formatMoney, humanizeStatus } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const TABS = ["Invoices", "Quotes", "Projects"] as const;
type Tab = (typeof TABS)[number];

/** Statuses that still owe money. Mirrors the invoice list and the server's own definition. */
const OPEN_STATUSES = new Set(["sent", "unpaid", "partially_paid", "overdue"]);

/**
 * The status to show for an invoice.
 *
 * <p>The overdue sweep runs once a day, so between the due date and the next sweep a late invoice
 * is still stored as `sent`. Deriving lateness from the due date keeps this screen honest in that
 * window — and agreeing with the invoice list, which does the same.
 */
function effectiveStatus(invoice: ClientInvoiceSummary) {
  if (!OPEN_STATUSES.has(invoice.status)) return invoice.status;
  const late = daysOverdue(invoice.dueDate);
  return late !== null && late > 0 ? "overdue" : invoice.status;
}

export default function ClientDetailPage() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId;

  // Both are tagged with the contact they describe. Next reuses this component when the route
  // moves from one contact to another, so untagged state would show the previous contact's
  // invoices under the new contact's name for as long as the second request takes.
  const [loaded, setLoaded] = useState<{ id: string; data: ClientOverview } | null>(null);
  const [failed, setFailed] = useState<{ id: string; message: string } | null>(null);
  const [tab, setTab] = useState<Tab>("Invoices");
  const [editing, setEditing] = useState(false);

  const overview = loaded?.id === clientId ? loaded.data : null;
  const error = failed?.id === clientId ? failed.message : null;

  useEffect(() => {
    let cancelled = false;
    getClientOverview(clientId)
      .then((data) => {
        if (!cancelled) setLoaded({ id: clientId, data });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setFailed({
          id: clientId,
          message: err instanceof ApiError ? err.message : "Failed to load this contact",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const counts = useMemo(
    () => ({
      Invoices: overview?.invoices.length ?? 0,
      Quotes: overview?.quotes.length ?? 0,
      Projects: overview?.projects.length ?? 0,
    }),
    [overview],
  );

  if (!overview) {
    return error ? (
      <Placeholder
        title="This contact could not be loaded"
        hint={error}
        action={{ href: "/clients", label: "Back to contacts" }}
      />
    ) : (
      <Placeholder title="Loading contact…" hint="Fetching their details and history." />
    );
  }

  const { client, stats, invoices, quotes, projects } = overview;

  return (
    <div className="space-y-6">
      <Link
        href="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ChevronLeftIcon className="size-4" />
        Contacts
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <span
            title={client.type === "business" ? "Organisation" : "Person"}
            className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-muted"
          >
            {client.type === "business" ? (
              <BuildingIcon className="size-6" />
            ) : (
              <PersonIcon className="size-6" />
            )}
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{client.name}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              {client.customerNumber !== null ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium tabular-nums text-foreground">
                  #{client.customerNumber}
                </span>
              ) : null}
              {client.contactName ? <span>{client.contactName}</span> : null}
              {client.position ? <span>{client.position}</span> : null}
              <span>Customer since {formatDate(client.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Link
            href={`/quotes/new?clientId=${client.id}`}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
          >
            New quote
          </Link>
          <Link
            href={`/invoices/new?clientId=${client.id}`}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
          >
            New invoice
          </Link>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-blue-700"
          >
            <PencilIcon className="size-4" />
            Edit contact
          </button>
        </div>
      </header>

      {client.archivedAt ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800">This contact is archived</p>
          <p className="mt-1 text-sm text-amber-700">
            Archived on {formatDate(client.archivedAt)}. They no longer appear in the contact list,
            but everything issued to them is unchanged and still counted below.
          </p>
        </div>
      ) : null}

      <Stats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center gap-1 border-b border-border px-4 py-3">
            {TABS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setTab(name)}
                aria-pressed={tab === name}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  tab === name
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted hover:bg-slate-100 hover:text-foreground",
                )}
              >
                {name}
                <span className="ml-1.5 text-xs opacity-70">{counts[name]}</span>
              </button>
            ))}
          </div>

          {tab === "Invoices" ? <InvoiceTable invoices={invoices} /> : null}
          {tab === "Quotes" ? <QuoteTable quotes={quotes} /> : null}
          {tab === "Projects" ? <ProjectTable projects={projects} /> : null}
        </section>

        <aside className="space-y-6">
          <ContactCard client={client} />
          <AddressCard client={client} />
          <TermsCard client={client} stats={stats} />
          <TaxAndBankCard client={client} />
          {client.notes ? (
            <Card title="Notes">
              <p className="whitespace-pre-wrap text-sm text-foreground">{client.notes}</p>
            </Card>
          ) : null}
        </aside>
      </div>

      <ClientDialog
        // Keyed on the contact so the form always mounts with the values currently on screen.
        key={client.id}
        open={editing}
        client={client}
        onClose={() => setEditing(false)}
        onCreated={(saved) => {
          // Only the contact changed; the history and totals are untouched by an edit, so they
          // are kept rather than refetched.
          setLoaded((current) =>
            current ? { ...current, data: { ...current.data, client: saved } } : current,
          );
          setEditing(false);
        }}
      />
    </div>
  );
}

/* --- headline figures ----------------------------------------------------- */

function Stats({ stats }: { stats: ClientStats }) {
  return (
    <section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total invoiced"
          value={formatMoney(stats.totalInvoiced, stats.currency)}
          hint={
            stats.lastInvoiceDate
              ? `${stats.invoiceCount} invoice${stats.invoiceCount === 1 ? "" : "s"}, last ${formatDate(stats.lastInvoiceDate)}`
              : "Nothing issued yet"
          }
        />
        <StatTile
          label="Paid"
          value={formatMoney(stats.totalPaid, stats.currency)}
          hint={
            stats.averageDaysToPay !== null
              ? `Settles in ${stats.averageDaysToPay} day${stats.averageDaysToPay === 1 ? "" : "s"} on average`
              : "No payment recorded yet"
          }
        />
        <StatTile
          label="Outstanding"
          value={formatMoney(stats.outstanding, stats.currency)}
          hint={`${stats.openInvoiceCount} open invoice${stats.openInvoiceCount === 1 ? "" : "s"}`}
          tone={stats.outstanding > 0 ? "warn" : "neutral"}
        />
        <StatTile
          label="Overdue"
          value={formatMoney(stats.overdue, stats.currency)}
          hint={
            stats.overdueInvoiceCount === 0
              ? "Nothing late"
              : `${stats.overdueInvoiceCount} invoice${stats.overdueInvoiceCount === 1 ? "" : "s"} past due`
          }
          tone={stats.overdue > 0 ? "danger" : "neutral"}
        />
      </div>

      {/* Said out loud rather than folded into the totals: a figure that mixes currencies is
          true of nothing, and a silently partial one is worse than a caveated one. */}
      {stats.excludedCurrencies.length > 0 ? (
        <p className="mt-3 text-sm text-muted">
          Figures cover {stats.currency} only. This contact also has documents in{" "}
          {stats.excludedCurrencies.join(", ")}, which are listed below but not counted above.
        </p>
      ) : null}
    </section>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warn" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p
        className={cn(
          "mt-2 text-2xl font-semibold tabular-nums",
          tone === "danger"
            ? "text-red-600"
            : tone === "warn"
              ? "text-amber-600"
              : "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  );
}

/* --- history tables ------------------------------------------------------- */

function InvoiceTable({ invoices }: { invoices: ClientInvoiceSummary[] }) {
  if (invoices.length === 0) {
    return (
      <EmptyRow
        title="No invoices yet"
        hint="Every invoice issued to this contact appears here, newest first."
      />
    );
  }

  return (
    <TableFrame
      headers={["Status", "Invoice no.", "Issued", "Due", "Total", "Balance"]}
      numericFrom={4}
    >
      {invoices.map((invoice) => {
        const status = effectiveStatus(invoice);
        const late = daysOverdue(invoice.dueDate);
        return (
          <tr key={invoice.id} className="border-b border-border last:border-0 hover:bg-slate-50/70">
            <td className="px-4 py-3">
              <StatusPill status={humanizeStatus(status)} />
            </td>
            <td className="px-4 py-3">
              <Link
                href={`/invoices/${invoice.id}`}
                className="font-medium text-foreground hover:text-primary hover:underline"
              >
                {invoice.invoiceNumber}
              </Link>
            </td>
            <td className="px-4 py-3 text-muted">{formatDate(invoice.issueDate)}</td>
            <td className="px-4 py-3 text-muted">
              {formatDate(invoice.dueDate)}
              {status === "overdue" && late !== null ? (
                <span className="block text-xs text-red-600">
                  {late} day{late === 1 ? "" : "s"} late
                </span>
              ) : null}
            </td>
            <td className="px-4 py-3 text-right tabular-nums text-foreground">
              {formatMoney(invoice.totalAmount, invoice.currency)}
            </td>
            <td
              className={cn(
                "px-4 py-3 text-right tabular-nums",
                invoice.balanceDue > 0 ? "font-medium text-foreground" : "text-muted",
              )}
            >
              {formatMoney(invoice.balanceDue, invoice.currency)}
            </td>
          </tr>
        );
      })}
    </TableFrame>
  );
}

function QuoteTable({ quotes }: { quotes: ClientQuoteSummary[] }) {
  if (quotes.length === 0) {
    return (
      <EmptyRow
        title="No quotes yet"
        hint="Quotes sent to this contact appear here, including the ones already converted."
      />
    );
  }

  return (
    <TableFrame headers={["Status", "Quote no.", "Issued", "Valid until", "Total"]} numericFrom={4}>
      {quotes.map((quote) => (
        <tr key={quote.id} className="border-b border-border last:border-0 hover:bg-slate-50/70">
          <td className="px-4 py-3">
            <StatusPill status={humanizeStatus(quote.status)} />
          </td>
          <td className="px-4 py-3">
            <Link
              href={`/quotes/${quote.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {quote.quoteNumber}
            </Link>
          </td>
          <td className="px-4 py-3 text-muted">{formatDate(quote.issueDate)}</td>
          <td className="px-4 py-3 text-muted">{formatDate(quote.validUntil)}</td>
          <td className="px-4 py-3 text-right tabular-nums text-foreground">
            {formatMoney(quote.totalAmount, quote.currency)}
          </td>
        </tr>
      ))}
    </TableFrame>
  );
}

function ProjectTable({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <EmptyRow
        title="No projects yet"
        hint="Jobs run for this contact appear here, with the budget agreed for each."
      />
    );
  }

  return (
    <TableFrame headers={["Status", "Project", "Site", "Dates", "Budget"]} numericFrom={4}>
      {projects.map((project) => (
        <tr key={project.id} className="border-b border-border last:border-0 hover:bg-slate-50/70">
          <td className="px-4 py-3">
            <StatusPill status={humanizeStatus(project.status)} />
          </td>
          <td className="px-4 py-3">
            <Link
              href={`/projects/${project.id}`}
              className="font-medium text-foreground hover:text-primary hover:underline"
            >
              {project.name}
            </Link>
            {project.code ? <span className="block text-xs text-muted">{project.code}</span> : null}
          </td>
          <td className="px-4 py-3 text-muted">{project.jobSiteCity ?? "—"}</td>
          <td className="px-4 py-3 text-muted">
            {project.startDate || project.endDate
              ? `${formatDate(project.startDate)} – ${formatDate(project.endDate)}`
              : "—"}
          </td>
          <td className="px-4 py-3 text-right tabular-nums text-foreground">
            {formatMoney(project.budgetAmount, project.currency)}
          </td>
        </tr>
      ))}
    </TableFrame>
  );
}

function TableFrame({
  headers,
  numericFrom,
  children,
}: {
  headers: string[];
  /** Index of the first right-aligned column. Money lines up on the right. */
  numericFrom: number;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50/70">
            {headers.map((header, index) => (
              <th
                key={header}
                scope="col"
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted",
                  index >= numericFrom && "text-right",
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyRow({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="px-4 py-16">
      <div className="mx-auto max-w-sm text-center">
        <div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100">
          <InboxIcon className="size-5 text-muted" />
        </div>
        <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm text-muted">{hint}</p>
      </div>
    </div>
  );
}

/* --- sidebar -------------------------------------------------------------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 break-words text-right text-foreground">{children}</span>
    </div>
  );
}

function ContactCard({ client }: { client: Client }) {
  // The primary email and phone are already shown above; a duplicate row adds nothing.
  const extras = client.contactDetails.filter(
    (detail) => detail.value !== client.email && detail.value !== client.phone,
  );

  return (
    <Card title="Contact">
      <Field label="Email">
        {client.email ? (
          <a href={`mailto:${client.email}`} className="text-primary hover:underline">
            {client.email}
          </a>
        ) : (
          "—"
        )}
      </Field>
      <Field label="Phone">
        {client.phone ? (
          <a href={`tel:${client.phone}`} className="text-primary hover:underline">
            {client.phone}
          </a>
        ) : (
          "—"
        )}
      </Field>
      {extras.map((detail) => (
        <Field key={detail.id} label={detailLabel(detail)}>
          <span className="break-all">{detail.value}</span>
        </Field>
      ))}
    </Card>
  );
}

/** "Email · billing" — the kind alone would not say which of three numbers this is. */
function detailLabel(detail: ContactDetail) {
  const kind = detail.kind === "website" ? "Website" : detail.kind === "email" ? "Email" : "Phone";
  return detail.label ? `${kind} · ${detail.label}` : kind;
}

function AddressCard({ client }: { client: Client }) {
  const lines = [
    client.addressLine1,
    client.addressLine2,
    [client.postalCode, client.city].filter(Boolean).join(" "),
    client.region,
    client.countryCode,
  ].filter((line): line is string => Boolean(line && line.trim().length > 0));

  return (
    <Card title="Address">
      {lines.length === 0 ? (
        <p className="text-sm text-muted">
          No address on file. An invoice needs one, so add it before issuing.
        </p>
      ) : (
        <address className="text-sm not-italic leading-relaxed text-foreground">
          {lines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </address>
      )}
    </Card>
  );
}

function TermsCard({ client, stats }: { client: Client; stats: ClientStats }) {
  return (
    <Card title="Billing terms">
      <Field label="Payment terms">
        {client.paymentTermsDays !== null ? `${client.paymentTermsDays} days` : "Company default"}
      </Field>
      {/* Skonto is meaningless as two separate numbers, so it is shown as the one sentence it is. */}
      <Field label="Early payment">
        {client.discountDays !== null && client.discountPercent !== null
          ? `${client.discountPercent}% within ${client.discountDays} days`
          : "—"}
      </Field>
      <Field label="Standing discount">
        {client.customerDiscount !== null
          ? client.customerDiscountUnit === "percent"
            ? `${client.customerDiscount}%`
            : formatMoney(client.customerDiscount, stats.currency)
          : "—"}
      </Field>
      <Field label="E-invoice">{client.einvoiceStandard ? "Required" : "Not required"}</Field>
      {client.terms ? (
        <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-sm text-muted">
          {client.terms}
        </p>
      ) : null}
    </Card>
  );
}

function TaxAndBankCard({ client }: { client: Client }) {
  return (
    <Card title="Tax and bank">
      <Field label="VAT ID">{client.vatNumber ?? "—"}</Field>
      <Field label="Tax number">{client.taxNumber ?? "—"}</Field>
      <Field label="Debtor no.">{client.debtorNumber ?? "—"}</Field>
      <Field label="Creditor no.">{client.creditorNumber ?? "—"}</Field>
      <Field label="IBAN">
        <span className="break-all font-mono text-xs">{client.iban ?? "—"}</span>
      </Field>
      <Field label="BIC">
        <span className="font-mono text-xs">{client.bic ?? "—"}</span>
      </Field>
    </Card>
  );
}

/* --- loading and failure -------------------------------------------------- */

function Placeholder({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-16 text-center shadow-sm">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{hint}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-4 inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
        >
          {action.label}
        </Link>
      ) : null}
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
const PencilIcon = icon(<><path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5Z" /><path d="m13.5 6.5 4 4" /></>);
const PersonIcon = icon(<><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" /></>);
const BuildingIcon = icon(<><path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" /><path d="M15 10h4a1 1 0 0 1 1 1v10" /><path d="M7 8h4M7 12h4M7 16h4" /><path d="M3 21h18" /></>);
const InboxIcon = icon(<><path d="M3 13h5l1.5 2.5h5L16 13h5" /><path d="M4.5 5h15l1.5 8v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4Z" /></>);
