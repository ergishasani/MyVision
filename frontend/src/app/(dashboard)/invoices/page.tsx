"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { listClients } from "@/lib/api/dashboard";
import { listInvoices } from "@/lib/api/invoices";
import type { Client, Invoice } from "@/types/api";
import {
  Cell,
  DataTable,
  PageHeader,
  Row,
  StatusPill,
  TabBar,
} from "@/components/layout/page-shell";
import { daysOverdue, formatDate, formatMoney } from "@/lib/utils/format";

const TABS = ["All", "Draft", "Sent", "Unpaid", "Overdue", "Paid", "Cancelled"] as const;

const COLUMNS = [
  { key: "status", label: "Status" },
  { key: "number", label: "Invoice no." },
  { key: "client", label: "Client" },
  { key: "issued", label: "Issue date" },
  { key: "due", label: "Due date" },
  { key: "total", label: "Total", numeric: true },
  { key: "balance", label: "Balance", numeric: true },
];

/** Statuses that still owe money, used for the outstanding figure and the Unpaid tab. */
const OPEN_STATUSES = new Set(["sent", "unpaid", "partially_paid", "overdue"]);

/**
 * An invoice is shown as overdue when its due date has passed and it still owes money.
 *
 * <p>The backend sweep sets the `overdue` status once a day, so between the due date and the
 * next sweep the stored status still reads `sent`. Deriving it here keeps the list honest in
 * that window rather than showing a late invoice as merely sent.
 */
function isOverdue(invoice: Invoice) {
  if (!OPEN_STATUSES.has(invoice.status)) return false;
  const days = daysOverdue(invoice.dueDate);
  return days !== null && days > 0;
}

function matchesTab(invoice: Invoice, tab: string) {
  switch (tab) {
    case "All":
      return true;
    case "Draft":
      return invoice.status === "draft";
    case "Sent":
      return invoice.status === "sent";
    case "Unpaid":
      return OPEN_STATUSES.has(invoice.status);
    case "Overdue":
      return isOverdue(invoice) || invoice.status === "overdue";
    case "Paid":
      return invoice.status === "paid";
    case "Cancelled":
      return invoice.status === "cancelled";
    default:
      return true;
  }
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("All");

  useEffect(() => {
    Promise.all([listInvoices(), listClients()])
      .then(([invoiceList, clientList]) => {
        setInvoices(invoiceList);
        setClients(clientList);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Failed to load invoices");
      })
      .finally(() => setLoading(false));
  }, []);

  const clientName = useMemo(() => {
    const byId = new Map(clients.map((c) => [c.id, c.name]));
    return (id: string) => byId.get(id) ?? "—";
  }, [clients]);

  const visible = useMemo(
    () => invoices.filter((invoice) => matchesTab(invoice, tab)),
    [invoices, tab],
  );

  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const label of TABS) {
      result[label] = invoices.filter((invoice) => matchesTab(invoice, label)).length;
    }
    return result;
  }, [invoices]);

  // Outstanding is the sum of what is still owed, which is what the operator actually chases.
  const outstanding = useMemo(
    () =>
      invoices
        .filter((invoice) => OPEN_STATUSES.has(invoice.status))
        .reduce((sum, invoice) => sum + Number(invoice.balanceDue), 0),
    [invoices],
  );

  const currency = invoices[0]?.currency ?? "EUR";

  const rows =
    visible.length > 0
      ? visible.map((invoice) => {
          const overdue = isOverdue(invoice);
          const late = daysOverdue(invoice.dueDate);
          return (
            <Row key={invoice.id}>
              <Cell>
                <StatusPill status={overdue ? "overdue" : invoice.status} />
              </Cell>
              <Cell>
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {invoice.invoiceNumber}
                </Link>
              </Cell>
              <Cell>{clientName(invoice.clientId)}</Cell>
              <Cell>{formatDate(invoice.issueDate)}</Cell>
              <Cell>
                <span className={overdue ? "text-red-600" : undefined}>
                  {formatDate(invoice.dueDate)}
                  {overdue && late !== null ? (
                    <span className="ml-1 text-xs">({late}d late)</span>
                  ) : null}
                </span>
              </Cell>
              <Cell numeric>{formatMoney(invoice.totalAmount, invoice.currency)}</Cell>
              <Cell numeric>
                <span className={Number(invoice.balanceDue) > 0 ? "font-medium" : "text-muted"}>
                  {formatMoney(invoice.balanceDue, invoice.currency)}
                </span>
              </Cell>
            </Row>
          );
        })
      : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        summary={
          loading || outstanding === 0
            ? undefined
            : `Outstanding: ${formatMoney(outstanding, currency)}`
        }
        description="Issue invoices and monitor payment status."
        action={{ label: "Write an invoice", href: "/invoices/new" }}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Could not load invoices</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <TabBar tabs={[...TABS]} value={tab} onChange={setTab} counts={counts} />
        <DataTable
          columns={COLUMNS}
          rows={rows}
          total={visible.length}
          emptyTitle={loading ? "Loading invoices…" : "No invoices here"}
          emptyHint={
            loading
              ? "Fetching your invoices from the API."
              : tab === "All"
                ? "Create an invoice, or convert an accepted quote into one."
                : `No invoices match the ${tab.toLowerCase()} filter.`
          }
        />
      </section>
    </div>
  );
}
