import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function SteerPage() {
  return (
    <PageShell title="Taxes" description="VAT returns, filings, and your tax adviser.">
      <PanelGrid>
        <Panel title="Constitution" description="How this business is set up for tax: scheme, periods, and obligations." />
        <Panel title="YOUR" description="The advance VAT return, computed from issued invoices." />
        <Panel title="My tax advisor" description="Sharing figures with whoever prepares your filings." />
      </PanelGrid>
    </PageShell>
  );
}
