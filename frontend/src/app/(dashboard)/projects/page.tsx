"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function ProjectsPage() {
  const p = useT().pages.projectsAll;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.active, p.tabs.onHold, p.tabs.completed]}
      columns={[
        { key: "status", label: p.columns.status },
        { key: "name", label: p.columns.name },
        { key: "client", label: p.columns.client },
        { key: "start", label: p.columns.start },
        { key: "budget", label: p.columns.budget, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
