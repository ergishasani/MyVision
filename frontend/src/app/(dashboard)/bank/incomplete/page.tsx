"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function IncompleteBankPage() {
  const p = useT().pages.bankIncomplete;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.unmatched, p.tabs.partial]}
      columns={[
        { key: "date", label: p.columns.date },
        { key: "purpose", label: p.columns.purpose },
        { key: "amount", label: p.columns.amount, numeric: true },
        { key: "open", label: p.columns.open, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
