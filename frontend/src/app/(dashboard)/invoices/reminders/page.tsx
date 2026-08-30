"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function InvoiceRemindersPage() {
  const p = useT().pages.invoicesReminders;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.dueSoon, p.tabs.overdue, p.tabs.sent]}
      columns={[
        { key: "level", label: p.columns.level },
        { key: "invoice", label: p.columns.invoice },
        { key: "client", label: p.columns.client },
        { key: "due", label: p.columns.due },
        { key: "days", label: p.columns.days, numeric: true },
        { key: "balance", label: p.columns.balance, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
