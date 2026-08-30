"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function SusaPage() {
  const p = useT().pages.evaluationsSusa;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      columns={[
        { key: "account", label: p.columns.account },
        { key: "name", label: p.columns.name },
        { key: "debit", label: p.columns.debit, numeric: true },
        { key: "credit", label: p.columns.credit, numeric: true },
        { key: "balance", label: p.columns.balance, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
