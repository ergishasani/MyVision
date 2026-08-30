"use client";

import { PageShell, Panel } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function NewInvoicePaymentPage() {
  const t = useT();
  const p = t.scaffold.stubs.invoicePaymentNew;

  return (
    <PageShell title={p.title} description={p.description}>
      <Panel title={t.scaffold.notBuiltTitle} description={t.scaffold.notBuiltDescription} />
    </PageShell>
  );
}
