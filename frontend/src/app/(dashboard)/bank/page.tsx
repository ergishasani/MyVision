import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function BankPage() {
  return (
    <PageShell title="Bank" description="Account movements, cash book, and unmatched entries.">
      <PanelGrid>
        <Panel title="Content" description="Payments recorded against your invoices." />
        <Panel title="Cash book" description="Cash taken and paid out, outside the bank." />
        <Panel title="Incomplete" description="Movements that have not been matched to a document." />
      </PanelGrid>
    </PageShell>
  );
}
