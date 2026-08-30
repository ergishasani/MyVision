"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function RecurringEvidencePage() {
  const p = useT().pages.evidenceRecurring;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.active, p.tabs.ended]}
      columns={[
        { key: "name", label: p.columns.name },
        { key: "supplier", label: p.columns.supplier },
        { key: "interval", label: p.columns.interval },
        { key: "next", label: p.columns.next },
        { key: "amount", label: p.columns.amount, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
