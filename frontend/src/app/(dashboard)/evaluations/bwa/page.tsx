import { PageShell } from "@/components/layout/page-shell";

export default function BwaPage() {
  return (
    <PageShell
      title="BWA"
      description="Business assessment: revenue against costs."
      columns={[
        { key: "line", label: "Line" },
        { key: "current", label: "Period", numeric: true },
        { key: "previous", label: "Previous", numeric: true },
        { key: "change", label: "Change", numeric: true },
      ]}
      emptyTitle="No assessment available"
      emptyHint="A BWA compares revenue with costs. Costs are not captured, so only the revenue half would be real and a half-real financial statement is worse than none."
    />
  );
}
