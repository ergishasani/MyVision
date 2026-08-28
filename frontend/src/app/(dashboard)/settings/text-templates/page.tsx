import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function TextTemplatesPage() {
  return (
    <PageShell title="Text templates" description="Standard wording reused across documents and email.">
      <PanelGrid>
        <Panel title="Document footers" description="Payment terms and notes printed under invoice and quote totals." />
        <Panel title="Email wording" description="Subject and body for invoice, reminder, and verification email." />
      </PanelGrid>
    </PageShell>
  );
}
