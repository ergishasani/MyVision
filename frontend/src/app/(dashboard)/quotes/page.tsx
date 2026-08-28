import { PageShell } from "@/components/layout/page-shell";

export default function QuotesPage() {
  return (
    <PageShell
      title="Quotes"
      description="Create, send, and convert quotes to invoices."
      action={{ label: "New quote", href: "/quotes/new" }}
      tabs={["All", "Draft", "Sent", "Accepted", "Rejected", "Converted"]}
      columns={[
        { key: "status", label: "Status" },
        { key: "number", label: "Quote no." },
        { key: "client", label: "Client" },
        { key: "issued", label: "Issue date" },
        { key: "valid", label: "Valid until" },
        { key: "total", label: "Total", numeric: true },
      ]}
      emptyTitle="No quotes yet"
      emptyHint="Quotes you send to clients appear here, and can be converted to invoices once accepted."
    />
  );
}
