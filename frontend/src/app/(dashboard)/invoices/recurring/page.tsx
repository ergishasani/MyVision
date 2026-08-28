import { PageShell } from "@/components/layout/page-shell";

export default function RecurringInvoicesPage() {
  return (
    <PageShell
      title="Recurring invoices"
      description="Invoices issued automatically on a schedule."
      tabs={["All", "Active", "Paused"]}
      columns={[
        { key: "status", label: "Status" },
        { key: "client", label: "Client" },
        { key: "interval", label: "Interval" },
        { key: "next", label: "Next issue" },
        { key: "amount", label: "Amount", numeric: true },
      ]}
      emptyTitle="No recurring invoices"
      emptyHint="Recurring billing is not implemented in the API yet. The invoice engine it would drive is."
    />
  );
}
