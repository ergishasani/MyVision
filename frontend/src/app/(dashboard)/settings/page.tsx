import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function SettingsPage() {
  return (
    <PageShell title="Settings" description="Company profile, billing defaults, and team settings.">
      <PanelGrid>
        <Panel title="Company" description="Legal name, address, tax identifiers and logo used on every document." />
        <Panel title="Invoicing" description="Numbering, payment terms, and the defaults applied to new documents." />
        <Panel title="Taxes" description="VAT rates and the compliance rules applied to invoice totals." />
        <Panel title="Team" description="Teammates, roles, and who can see or change what." />
      </PanelGrid>
    </PageShell>
  );
}
