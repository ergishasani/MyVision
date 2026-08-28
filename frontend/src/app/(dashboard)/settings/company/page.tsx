import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function CompanySettingsPage() {
  return (
    <PageShell title="Company settings" description="Manage legal business details, address, tax identifiers, and company logo.">
      <PanelGrid>
        <Panel title="Business identity" description="Legal name, owner, and registered address printed on invoices." />
        <Panel title="Tax identifiers" description="VAT ID and tax number, required on compliant German invoices." />
      </PanelGrid>
    </PageShell>
  );
}
