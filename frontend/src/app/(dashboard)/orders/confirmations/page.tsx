import { PageShell } from "@/components/layout/page-shell";

export default function OrderConfirmationsPage() {
  return (
    <PageShell
      title="Order confirmations"
      description="Confirm an accepted offer before work begins."
      tabs={["All", "Draft", "Sent"]}
      columns={[
        { key: "status", label: "Status" },
        { key: "number", label: "No." },
        { key: "client", label: "Client" },
        { key: "date", label: "Date" },
        { key: "amount", label: "Amount", numeric: true },
      ]}
      emptyTitle="No order confirmations"
      emptyHint="Confirmations are created from an accepted offer. Nothing is stored for them yet."
    />
  );
}
