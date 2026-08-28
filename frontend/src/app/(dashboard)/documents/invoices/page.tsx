import { PageShell } from "@/components/layout/page-shell";

export default function InvoiceDocumentsPage() {
  return (
    <PageShell
      title="Invoice documents"
      description="Browse invoice PDFs."
      columns={[
        { key: "name", label: "Document" },
        { key: "invoice", label: "Invoice" },
        { key: "client", label: "Client" },
        { key: "created", label: "Created" },
        { key: "size", label: "Size", numeric: true },
      ]}
      emptyTitle="No invoice PDFs yet"
      emptyHint="A PDF is stored here each time you generate one from an invoice."
    />
  );
}
