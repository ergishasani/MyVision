import { PageShell } from "@/components/layout/page-shell";

export default function SusaPage() {
  return (
    <PageShell
      title="SuSa"
      description="Trial balance across accounting accounts."
      columns={[
        { key: "account", label: "Account" },
        { key: "name", label: "Name" },
        { key: "debit", label: "Debit", numeric: true },
        { key: "credit", label: "Credit", numeric: true },
        { key: "balance", label: "Balance", numeric: true },
      ]}
      emptyTitle="No trial balance available"
      emptyHint="A trial balance needs a double-entry ledger with an SKR account plan. MyVision records invoices and payments, not bookkeeping entries, so there is nothing to total."
    />
  );
}
