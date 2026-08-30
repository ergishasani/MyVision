"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function CashBookPage() {
  const p = useT().pages.bankCashBook;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.inbound, p.tabs.outbound]}
      columns={[
        { key: "date", label: p.columns.date },
        { key: "purpose", label: p.columns.purpose },
        { key: "counterparty", label: p.columns.counterparty },
        { key: "amount", label: p.columns.amount, numeric: true },
        { key: "balance", label: p.columns.balance, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
