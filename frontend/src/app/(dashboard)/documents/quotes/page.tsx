"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function QuoteDocumentsPage() {
  const p = useT().pages.documentsQuotes;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      columns={[
        { key: "name", label: p.columns.name },
        { key: "quote", label: p.columns.quote },
        { key: "client", label: p.columns.client },
        { key: "created", label: p.columns.created },
        { key: "size", label: p.columns.size, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
