import { PageShell } from "@/components/layout/page-shell";

export default function DeliveryNotesPage() {
  return (
    <PageShell
      title="Delivery notes"
      description="Record what was delivered to the job site, and when."
      tabs={["All", "Draft", "Delivered"]}
      columns={[
        { key: "status", label: "Status" },
        { key: "number", label: "No." },
        { key: "client", label: "Client" },
        { key: "date", label: "Delivery date" },
        { key: "project", label: "Project" },
      ]}
      emptyTitle="No delivery notes"
      emptyHint="Delivery notes have no backend yet; this screen is routed and ready for one."
    />
  );
}
