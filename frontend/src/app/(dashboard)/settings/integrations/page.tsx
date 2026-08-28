import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function IntegrationsSettingsPage() {
  return (
    <PageShell title="Integrations" description="Connect email delivery, accounting exports, and payment providers.">
      <PanelGrid>
        <Panel title="Stripe" description="Card payments for invoices, and refund handling." />
        <Panel title="Accounting export" description="Handing data to your accountant or tax adviser." />
      </PanelGrid>
    </PageShell>
  );
}
