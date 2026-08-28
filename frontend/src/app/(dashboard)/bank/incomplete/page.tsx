import { PageShell } from "@/components/layout/page-shell";

export default function IncompleteBankPage() {
  return (
    <PageShell
      title="Incomplete"
      description="Movements not yet matched to an invoice or receipt."
      tabs={["All", "Unmatched", "Partially matched"]}
      columns={[
        { key: "date", label: "Booking day" },
        { key: "purpose", label: "Name / Purpose" },
        { key: "amount", label: "Amount", numeric: true },
        { key: "open", label: "Open", numeric: true },
      ]}
      emptyTitle="Nothing unmatched"
      emptyHint="Bank reconciliation requires a bank feed, which is not connected."
    />
  );
}
