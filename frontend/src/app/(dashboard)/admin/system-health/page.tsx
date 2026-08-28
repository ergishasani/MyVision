import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function AdminSystemHealthPage() {
  return (
    <PageShell title="System health" description="Monitor backend health, storage availability, email delivery, and deployment readiness.">
      <PanelGrid>
        <Panel title="Backend" description="Liveness, readiness, and database connectivity." />
        <Panel title="Providers" description="Email and storage availability." />
      </PanelGrid>
    </PageShell>
  );
}
