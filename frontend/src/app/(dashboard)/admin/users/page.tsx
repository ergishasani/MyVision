import { PageShell } from "@/components/layout/page-shell";

export default function AdminUsersPage() {
  return (
    <PageShell
      title="Admin users"
      description="Review registered users, verification status, roles, and account access."
      tabs={["All", "Verified", "Unverified"]}
      columns={[
        { key: "name", label: "User" },
        { key: "email", label: "Email" },
        { key: "role", label: "Role" },
        { key: "status", label: "Status" },
        { key: "last", label: "Last login" },
      ]}
      emptyTitle="No users to show"
      emptyHint="Registered users across the workspace appear here."
    />
  );
}
