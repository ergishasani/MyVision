import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function AddOnsPage() {
  return (
    <PageShell title="Add-ons" description="Optional features for this workspace.">
      <PanelGrid>
        <Panel title="Nothing to add yet" description="Add-ons need a subscription and billing system for your own customers, which is separate from invoicing theirs." />
      </PanelGrid>
    </PageShell>
  );
}
