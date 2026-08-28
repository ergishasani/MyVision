import { PageShell, Panel, PanelGrid } from "@/components/layout/page-shell";

export default function RevenueReportPage() {
  return (
    <PageShell title="Revenue report" description="Track monthly revenue, paid invoices, recurring patterns, and growth over time.">
      <PanelGrid>
        <Panel title="Monthly revenue" description="Invoiced versus paid, month by month." />
        <Panel title="Growth" description="How this period compares with the last." />
      </PanelGrid>
    </PageShell>
  );
}
