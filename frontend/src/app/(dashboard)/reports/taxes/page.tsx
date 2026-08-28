import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function TaxesReportPage() {
  return (
    <PageShell title="Tax report" description="Review VAT totals, tax breakdowns, reverse-charge invoices, and export-ready summaries.">
      <PanelGrid>
        <Panel title="VAT collected" description="Output tax per period, for the advance return." />
        <Panel title="Rate breakdown" description="Split across standard, reduced, and zero-rated lines." />
      </PanelGrid>
    </PageShell>
  );
}
