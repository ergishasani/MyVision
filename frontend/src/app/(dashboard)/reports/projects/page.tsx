import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function ProjectReportsPage() {
  return (
    <PageShell title="Project reports" description="Compare project profitability, invoice status, quote conversion, and payment activity.">
      <PanelGrid>
        <Panel title="Project value" description="Quoted, invoiced, and paid per project." />
        <Panel title="Margins" description="Budget against what was actually billed." />
      </PanelGrid>
    </PageShell>
  );
}
