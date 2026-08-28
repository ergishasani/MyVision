import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function ConstitutionPage() {
  return (
    <PageShell title="Constitution" description="How this business is set up for tax purposes.">
      <PanelGrid>
        <Panel title="Tax scheme" description="Standard or small-business, which changes the wording on every invoice." />
        <Panel title="Filing period" description="Monthly or quarterly advance returns." />
        <Panel title="Obligations" description="E-invoicing duties phase in from 2027; see docs/provider-and-compliance-decisions.md." />
      </PanelGrid>
    </PageShell>
  );
}
