import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function AdminPage() {
  return (
    <PageShell title="Admin" description="Access internal tools for users, audit logs, operational health, and system configuration.">
      <PanelGrid>
        <Panel title="Users" description="Registered accounts and their verification status." />
        <Panel title="Audit logs" description="A record of what changed, when, and who did it." />
        <Panel title="System health" description="Backend, storage, and email delivery status." />
      </PanelGrid>
    </PageShell>
  );
}
