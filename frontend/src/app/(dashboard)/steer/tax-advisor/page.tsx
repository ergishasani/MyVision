import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function TaxAdvisorPage() {
  return (
    <PageShell title="My tax advisor" description="Share figures with whoever prepares your filings.">
      <PanelGrid>
        <Panel title="Adviser access" description="Who can read your books, and what they can see." />
        <Panel title="Exports" description="Handing over data in a format an adviser can import." />
      </PanelGrid>
    </PageShell>
  );
}
