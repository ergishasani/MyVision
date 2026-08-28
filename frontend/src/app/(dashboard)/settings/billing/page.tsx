import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function BillingSettingsPage() {
  return (
    <PageShell title="Billing settings" description="Manage MyVision plan details, usage, subscription status, and billing contact information.">
      <PanelGrid>
        <Panel title="Your plan" description="The MyVision subscription for this workspace." />
        <Panel title="Payment method" description="How your own subscription is charged." />
      </PanelGrid>
    </PageShell>
  );
}
