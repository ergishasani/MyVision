import { PageShell } from "@/components/layout/page-shell";

export default function QuoteDocumentsPage() {
  return (
    <PageShell
      title="Quote documents"
      description="Browse quote documents."
      columns={[
        { key: "name", label: "Document" },
        { key: "quote", label: "Quote" },
        { key: "client", label: "Client" },
        { key: "created", label: "Created" },
        { key: "size", label: "Size", numeric: true },
      ]}
      emptyTitle="No quote PDFs yet"
      emptyHint="A PDF is stored here each time you generate one from a quote."
    />
  );
}
