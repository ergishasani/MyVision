import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function OrdersPage() {
  return (
    <PageShell title="Orders" description="Offers, order confirmations, and delivery notes.">
      <PanelGrid>
        <Panel title="Offers" description="Quotes you send to clients, and the ones they have accepted." />
        <Panel title="Order confirmations" description="Confirming an accepted offer before work begins." />
        <Panel title="Delivery notes" description="What was delivered, and when." />
      </PanelGrid>
    </PageShell>
  );
}
