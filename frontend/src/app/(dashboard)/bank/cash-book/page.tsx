import { PageShell } from "@/components/layout/page-shell";

export default function CashBookPage() {
  return (
    <PageShell
      title="Cash book"
      description="Cash received and paid out, recorded outside the bank."
      tabs={["All", "In", "Out"]}
      columns={[
        { key: "date", label: "Date" },
        { key: "purpose", label: "Purpose" },
        { key: "counterparty", label: "Counterparty" },
        { key: "amount", label: "Amount", numeric: true },
        { key: "balance", label: "Balance", numeric: true },
      ]}
      emptyTitle="No cash entries"
      emptyHint="A cash book needs a ledger the API does not have. Card and transfer payments live under Bank -> Content."
    />
  );
}
