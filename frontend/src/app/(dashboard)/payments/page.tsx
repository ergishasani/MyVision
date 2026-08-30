"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function PaymentsPage() {
  const p = useT().pages.paymentsAll;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.bankTransfer, p.tabs.card, p.tabs.cash, p.tabs.stripe, p.tabs.other]}
      columns={[
        { key: "paid", label: p.columns.paid },
        { key: "invoice", label: p.columns.invoice },
        { key: "client", label: p.columns.client },
        { key: "method", label: p.columns.method },
        { key: "amount", label: p.columns.amount, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
