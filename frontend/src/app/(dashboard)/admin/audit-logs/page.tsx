import { PageShell } from "@/components/layout/page-shell";

export default function AdminAuditLogsPage() {
  return (
    <PageShell
      title="Audit logs"
      description="Inspect invoice, payment, document, and account changes recorded by the backend."
      tabs={["All", "Invoices", "Payments", "Documents", "Account"]}
      columns={[
        { key: "when", label: "When" },
        { key: "actor", label: "Actor" },
        { key: "entity", label: "Entity" },
        { key: "action", label: "Action" },
      ]}
      emptyTitle="No audit entries"
      emptyHint="The backend records invoice, payment and document changes here."
    />
  );
}
