import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function ApiAccessPage() {
  return (
    <PageShell title="API" description="Programmatic access to your own data.">
      <PanelGrid>
        <Panel title="Interactive docs" description="Swagger UI is served by the backend at /docs and requires authentication." />
        <Panel title="API tokens" description="Long-lived tokens for scripts are not issued yet; the API uses session JWTs." />
      </PanelGrid>
    </PageShell>
  );
}
