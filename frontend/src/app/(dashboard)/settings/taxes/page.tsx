import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function TaxSettingsPage() {
  return (
    <PageShell title="Tax settings" description="Define VAT rates, reverse-charge behavior, small-business rules, and country-specific defaults.">
      <PanelGrid>
        <Panel title="VAT rates" description="Standard and reduced rates applied to invoice lines." />
        <Panel title="Special cases" description="Reverse charge and small-business handling, which change the wording on the invoice." />
      </PanelGrid>
    </PageShell>
  );
}
