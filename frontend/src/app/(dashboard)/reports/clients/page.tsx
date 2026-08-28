import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function ClientReportsPage() {
  return (
    <PageShell title="Client reports" description="Analyze client revenue, outstanding balances, payment history, and document volume.">
      <PanelGrid>
        <Panel title="Top clients" description="Ranked by invoiced value." />
        <Panel title="Payment behaviour" description="Who pays on time and who does not." />
      </PanelGrid>
    </PageShell>
  );
}
