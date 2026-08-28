import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function InvoicingSettingsPage() {
  return (
    <PageShell title="Invoicing settings" description="Configure invoice numbering, payment terms, quote validity, notes, and document defaults.">
      <PanelGrid>
        <Panel title="Numbering" description="Prefix and next number. Invoice numbers must be unique and sequential." />
        <Panel title="Payment terms" description="Default due period, applied when an invoice has no explicit due date." />
      </PanelGrid>
    </PageShell>
  );
}
