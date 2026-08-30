"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function CreditNotesPage() {
  const p = useT().pages.invoicesCredits;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.draft, p.tabs.issued]}
      columns={[
        { key: "status", label: p.columns.status },
        { key: "number", label: p.columns.number },
        { key: "invoice", label: p.columns.invoice },
        { key: "client", label: p.columns.client },
        { key: "amount", label: p.columns.amount, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
