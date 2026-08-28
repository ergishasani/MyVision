import { PageShell } from "@/components/layout/page-shell";

export default function PaymentsPage() {
  return (
    <PageShell
      title="Payments"
      description="Review payments across invoices."
      tabs={["All", "Bank transfer", "Card", "Cash", "Stripe", "Other"]}
      columns={[
        { key: "paid", label: "Date" },
        { key: "invoice", label: "Invoice" },
        { key: "client", label: "Client" },
        { key: "method", label: "Method" },
        { key: "amount", label: "Amount", numeric: true },
      ]}
      emptyTitle="No payments recorded"
      emptyHint="Payments are recorded against an invoice, so start from the invoice you were paid for."
    />
  );
}
