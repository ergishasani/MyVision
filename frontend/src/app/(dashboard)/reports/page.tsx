import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function ReportsPage() {
  return (
    <PageShell title="Reports" description="Financial and project reporting will live here.">
      <PanelGrid>
        <Panel title="Revenue" description="Invoiced and paid totals over time." />
        <Panel title="Outstanding" description="What is still owed, and how late it is." />
        <Panel title="Clients" description="Who generates the most revenue." />
        <Panel title="Taxes" description="VAT collected per period, for your return." />
      </PanelGrid>
    </PageShell>
  );
}
