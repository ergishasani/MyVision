"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function EInvoiceDocumentsPage() {
  const p = useT().pages.documentsEInvoices;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      columns={[
        { key: "name", label: p.columns.name },
        { key: "invoice", label: p.columns.invoice },
        { key: "format", label: p.columns.format },
        { key: "created", label: p.columns.created },
        { key: "size", label: p.columns.size, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
