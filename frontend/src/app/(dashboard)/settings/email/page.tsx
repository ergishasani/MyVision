import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function EmailSettingsPage() {
  return (
    <PageShell title="Email settings" description="Manage sender identity, verification emails, password reset emails, and invoice delivery templates.">
      <PanelGrid>
        <Panel title="Sending domain" description="The verified domain outgoing mail is sent from." />
        <Panel title="Templates" description="Wording for invoice, reminder, and verification emails." />
      </PanelGrid>
    </PageShell>
  );
}
