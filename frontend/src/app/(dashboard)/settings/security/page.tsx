import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function SecuritySettingsPage() {
  return (
    <PageShell title="Security settings" description="Review active sessions, password settings, authentication status, and account safeguards.">
      <PanelGrid>
        <Panel title="Password" description="Change the password for this account." />
        <Panel title="Sessions" description="Active refresh tokens, and signing other devices out." />
      </PanelGrid>
    </PageShell>
  );
}
