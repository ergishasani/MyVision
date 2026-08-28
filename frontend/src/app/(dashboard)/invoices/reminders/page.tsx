import { PageShell } from "@/components/layout/page-shell";

export default function InvoiceRemindersPage() {
  return (
    <PageShell
      title="Reminders"
      description="Chase invoices that are past their due date."
      tabs={["All", "Due soon", "Overdue", "Sent"]}
      columns={[
        { key: "level", label: "Level" },
        { key: "invoice", label: "Invoice" },
        { key: "client", label: "Client" },
        { key: "due", label: "Due date" },
        { key: "days", label: "Days late", numeric: true },
        { key: "balance", label: "Balance", numeric: true },
      ]}
      emptyTitle="No reminders to send"
      emptyHint="Overdue invoices are detected by the daily sweep. Sending a reminder is not wired up yet."
    />
  );
}
