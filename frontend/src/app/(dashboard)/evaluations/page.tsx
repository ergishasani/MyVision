import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function EvaluationsPage() {
  return (
    <PageShell title="Evaluations" description="Reports and accounting summaries.">
      <PanelGrid>
        <Panel title="Reports" description="Revenue, outstanding balances, clients, projects, and tax." />
        <Panel title="SuSa" description="Trial balance across accounting accounts." />
        <Panel title="BWA" description="Business assessment: revenue against costs." />
      </PanelGrid>
    </PageShell>
  );
}
