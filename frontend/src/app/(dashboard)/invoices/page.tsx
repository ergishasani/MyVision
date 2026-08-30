"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useT } from "@/components/providers/locale-provider";
import { format } from "@/lib/i18n/format";
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

/** Filter keys. Deliberately not the visible labels — those change with the language. */
const TABS = ["all", "draft", "sent", "unpaid", "overdue", "paid", "cancelled"] as const;
type TabKey = (typeof TABS)[number];

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
    case "all":
      return true;
    case "draft":
      return invoice.status === "draft";
    case "sent":
      return invoice.status === "sent";
    case "unpaid":
      return OPEN_STATUSES.has(invoice.status);
    case "overdue":
      return isOverdue(invoice) || invoice.status === "overdue";
    case "paid":
      return invoice.status === "paid";
    case "cancelled":
      return invoice.status === "cancelled";
    default:
      return true;
  }
}

export default function InvoicesPage() {
  const t = useT();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey | string>("all");

  useEffect(() => {
    Promise.all([listInvoices(), listClients()])
      .then(([invoiceList, clientList]) => {
        setInvoices(invoiceList);
        setClients(clientList);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : t.invoices.loadError);
      })
      .finally(() => setLoading(false));
    // The dictionary is only read for the failure message; re-running on a language switch would
    // refetch every invoice for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      { key: "status", label: t.invoices.columns.status },
      { key: "number", label: t.invoices.columns.number },
      { key: "client", label: t.invoices.columns.client },
      { key: "issued", label: t.invoices.columns.issued },
      { key: "due", label: t.invoices.columns.due },
      { key: "total", label: t.invoices.columns.total, numeric: true },
      { key: "balance", label: t.invoices.columns.balance, numeric: true },
    ],
    [t],
  );

  const tabItems = useMemo(
    () => TABS.map((key) => ({ key, label: t.invoices.tabs[key] })),
    [t],
  );

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
                    <span className="ml-1 text-xs">{format(t.invoices.daysLate, { days: late })}</span>
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
        title={t.invoices.title}
        summary={
          loading || outstanding === 0
            ? undefined
            : format(t.invoices.outstanding, {
                amount: formatMoney(outstanding, currency),
              })
        }
        description={t.invoices.description}
        action={{ label: t.invoices.writeInvoice, href: "/invoices/new" }}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">{t.invoices.errorHeading}</p>
          <p className="mt-1 text-sm text-red-600">{error}</p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <TabBar tabs={tabItems} value={tab} onChange={setTab} counts={counts} />
        <DataTable
          columns={columns}
          rows={rows}
          total={visible.length}
          emptyTitle={loading ? t.invoices.loadingTitle : t.invoices.emptyTitle}
          emptyHint={
            loading
              ? t.invoices.loadingHint
              : tab === "all"
                ? t.invoices.emptyAllHint
                : format(t.invoices.emptyFilterHint, {
                    filter: t.invoices.tabs[tab as TabKey] ?? tab,
                  })
          }
        />
      </section>
    </div>
  );
}
