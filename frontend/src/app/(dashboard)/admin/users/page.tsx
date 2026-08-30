"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function AdminUsersPage() {
  const p = useT().pages.adminUsers;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.verified, p.tabs.unverified]}
      columns={[
        { key: "name", label: p.columns.name },
        { key: "email", label: p.columns.email },
        { key: "role", label: p.columns.role },
        { key: "status", label: p.columns.status },
        { key: "last", label: p.columns.last },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
