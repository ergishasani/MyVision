"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function DocumentsPage() {
  const p = useT().pages.documentsAll;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.invoices, p.tabs.quotes, p.tabs.eInvoices]}
      columns={[
        { key: "name", label: p.columns.name },
        { key: "type", label: p.columns.type },
        { key: "related", label: p.columns.related },
        { key: "created", label: p.columns.created },
        { key: "size", label: p.columns.size, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
