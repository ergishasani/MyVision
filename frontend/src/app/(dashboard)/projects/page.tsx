import { PageShell } from "@/components/layout/page-shell";

export default function ProjectsPage() {
  return (
    <PageShell
      title="Projects"
      description="Track jobs, budgets, and status per client."
      action={{ label: "New project", href: "/projects/new" }}
      tabs={["All", "Active", "On hold", "Completed"]}
      columns={[
        { key: "status", label: "Status" },
        { key: "name", label: "Project" },
        { key: "client", label: "Client" },
        { key: "start", label: "Start date" },
        { key: "budget", label: "Budget", numeric: true },
      ]}
      emptyTitle="No projects yet"
      emptyHint="Projects group quotes and invoices under one job."
    />
  );
}
