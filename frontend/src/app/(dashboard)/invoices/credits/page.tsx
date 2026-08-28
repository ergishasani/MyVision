import { PageShell } from "@/components/layout/page-shell";

export default function CreditNotesPage() {
  return (
    <PageShell
      title="Credits"
      description="Credit notes and cancellation invoices."
      tabs={["All", "Draft", "Issued"]}
      columns={[
        { key: "status", label: "Status" },
        { key: "number", label: "Credit no." },
        { key: "invoice", label: "Against invoice" },
        { key: "client", label: "Client" },
        { key: "amount", label: "Amount", numeric: true },
      ]}
      emptyTitle="No credit notes"
      emptyHint="A credit note reverses an issued invoice. The compliance rules for this are in docs/invoice-compliance-checklist.md."
    />
  );
}
