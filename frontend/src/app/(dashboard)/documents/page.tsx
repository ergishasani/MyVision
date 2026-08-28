import { PageShell } from "@/components/layout/page-shell";

export default function DocumentsPage() {
  return (
    <PageShell
      title="Documents"
      description="Browse generated and stored documents."
      tabs={["All", "Invoices", "Quotes", "E-invoices"]}
      columns={[
        { key: "name", label: "Document" },
        { key: "type", label: "Type" },
        { key: "related", label: "Related to" },
        { key: "created", label: "Created" },
        { key: "size", label: "Size", numeric: true },
      ]}
      emptyTitle="No documents generated yet"
      emptyHint="Generated invoice PDFs and XRechnung XML are stored here."
    />
  );
}
