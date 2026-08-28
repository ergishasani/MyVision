import { PageShell, Panel } from "@/components/layout/page-shell";

export default function NewProjectPage() {
  return (
    <PageShell title="New project" description="Create a project workspace.">
      <Panel
        title="Not built yet"
        description="This screen is scaffolded and routed. The form and its API wiring come next."
      />
    </PageShell>
  );
}
