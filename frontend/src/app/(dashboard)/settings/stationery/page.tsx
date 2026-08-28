import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function StationeryPage() {
  return (
    <PageShell title="Stationery" description="How printed documents look.">
      <PanelGrid>
        <Panel title="Logo" description="The mark shown on invoices and quotes; upload it under Company." />
        <Panel title="Layout" description="The PDF template is functional but not brand-final." />
      </PanelGrid>
    </PageShell>
  );
}
