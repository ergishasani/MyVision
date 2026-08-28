import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function ReferPage() {
  return (
    <PageShell title="Refer a friend" description="Invite another business to MyVision.">
      <PanelGrid>
        <Panel title="Not configured" description="The sidebar shows a 60 EUR reward taken from the reference design. Define a real programme, or change the amount, before this reaches customers." />
      </PanelGrid>
    </PageShell>
  );
}
