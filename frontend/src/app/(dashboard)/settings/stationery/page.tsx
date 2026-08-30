"use client";

import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function StationeryPage() {
  const s = useT().settings.stubs.stationery;

  return (
    <PageShell title={s.title} description={s.description}>
      <PanelGrid>
        <Panel title={s.a.title} description={s.a.description} />
        <Panel title={s.b.title} description={s.b.description} />
      </PanelGrid>
    </PageShell>
  );
}
