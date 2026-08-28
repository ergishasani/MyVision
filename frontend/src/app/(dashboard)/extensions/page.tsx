import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function ExtensionsPage() {
  return (
    <PageShell title="Extensions" description="Add-ons, integrations, and API access.">
      <PanelGrid>
        <Panel title="Add-ons" description="Optional features for this workspace." />
        <Panel title="The integration" description="Stripe, email delivery, and accounting exports." />
        <Panel title="API" description="Programmatic access to your own data." />
      </PanelGrid>
    </PageShell>
  );
}
