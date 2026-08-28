import { PageShell } from "@/components/layout/page-shell";

export default function RecurringEvidencePage() {
  return (
    <PageShell
      title="Recurring evidence"
      description="Costs that repeat on a schedule."
      tabs={["All", "Active", "Ended"]}
      columns={[
        { key: "name", label: "Name" },
        { key: "supplier", label: "Supplier" },
        { key: "interval", label: "Interval" },
        { key: "next", label: "Next due" },
        { key: "amount", label: "Amount", numeric: true },
      ]}
      emptyTitle="No recurring costs"
      emptyHint="Expense capture has no backend yet. This is an invoicing product; costs are a separate domain."
    />
  );
}
