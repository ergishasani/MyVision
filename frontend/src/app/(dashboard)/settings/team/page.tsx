import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function TeamSettingsPage() {
  return (
    <PageShell title="Team settings" description="Invite teammates, manage roles, and review account access.">
      <PanelGrid>
        <Panel title="Members" description="People with access to this workspace." />
        <Panel title="Roles" description="What owners, staff, and viewers are each allowed to do." />
      </PanelGrid>
    </PageShell>
  );
}
