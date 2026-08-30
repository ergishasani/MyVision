"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function AdminAuditLogsPage() {
  const p = useT().pages.adminAuditLogs;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.invoices, p.tabs.payments, p.tabs.documents, p.tabs.account]}
      columns={[
        { key: "when", label: p.columns.when },
        { key: "actor", label: p.columns.actor },
        { key: "entity", label: p.columns.entity },
        { key: "action", label: p.columns.action },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
