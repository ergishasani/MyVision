import { PageShell } from "@/components/layout/page-shell";

export default function OutstandingReportPage() {
  return (
    <PageShell
      title="Outstanding invoices"
      description="Monitor unpaid, overdue, and partially paid invoices by client and due date."
      tabs={["All", "Due soon", "Overdue"]}
      columns={[
        { key: "invoice", label: "Invoice" },
        { key: "client", label: "Client" },
        { key: "due", label: "Due date" },
        { key: "days", label: "Days overdue", numeric: true },
        { key: "balance", label: "Balance", numeric: true },
      ]}
      emptyTitle="Nothing outstanding"
      emptyHint="Unpaid and overdue invoices are listed here with their balances."
    />
  );
}
