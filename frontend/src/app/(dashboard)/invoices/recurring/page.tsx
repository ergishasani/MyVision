"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function RecurringInvoicesPage() {
  const p = useT().pages.invoicesRecurring;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.active, p.tabs.paused]}
      columns={[
        { key: "status", label: p.columns.status },
        { key: "client", label: p.columns.client },
        { key: "interval", label: p.columns.interval },
        { key: "next", label: p.columns.next },
        { key: "amount", label: p.columns.amount, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
