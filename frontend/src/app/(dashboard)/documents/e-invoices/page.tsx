import { PageShell } from "@/components/layout/page-shell";

export default function EInvoiceDocumentsPage() {
  return (
    <PageShell
      title="E-invoices"
      description="Browse XML e-invoice exports."
      columns={[
        { key: "name", label: "Document" },
        { key: "invoice", label: "Invoice" },
        { key: "format", label: "Format" },
        { key: "created", label: "Created" },
        { key: "size", label: "Size", numeric: true },
      ]}
      emptyTitle="No e-invoices exported yet"
      emptyHint="XRechnung XML exports appear here. They must pass a validator before real delivery."
    />
  );
}
