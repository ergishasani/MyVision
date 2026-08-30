"use client";

import { PageShell, Panel } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function SendQuotePage() {
  const t = useT();
  const p = t.scaffold.stubs.quoteSend;

  return (
    <PageShell title={p.title} description={p.description}>
      <Panel title={t.scaffold.notBuiltTitle} description={t.scaffold.notBuiltDescription} />
    </PageShell>
  );
}
