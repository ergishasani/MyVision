"use client";

import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function AdminSystemHealthPage() {
  const p = useT().scaffold.hubs.systemHealth;

  return (
    <PageShell title={p.title} description={p.description}>
      <PanelGrid>
        <Panel title={p.panels.p0.title} description={p.panels.p0.description} />
        <Panel title={p.panels.p1.title} description={p.panels.p1.description} />
      </PanelGrid>
    </PageShell>
  );
}
