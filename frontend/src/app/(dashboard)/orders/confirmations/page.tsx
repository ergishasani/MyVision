"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function OrderConfirmationsPage() {
  const p = useT().pages.ordersConfirmations;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.draft, p.tabs.sent]}
      columns={[
        { key: "status", label: p.columns.status },
        { key: "number", label: p.columns.number },
        { key: "client", label: p.columns.client },
        { key: "date", label: p.columns.date },
        { key: "amount", label: p.columns.amount, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
