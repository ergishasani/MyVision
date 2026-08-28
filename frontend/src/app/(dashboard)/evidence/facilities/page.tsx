import { PageShell } from "@/components/layout/page-shell";

export default function FacilitiesPage() {
  return (
    <PageShell
      title="Facilities"
      description="Fixed assets and their depreciation."
      tabs={["All", "In use", "Disposed"]}
      columns={[
        { key: "asset", label: "Asset" },
        { key: "acquired", label: "Acquired" },
        { key: "cost", label: "Cost", numeric: true },
        { key: "depreciation", label: "Depreciation", numeric: true },
        { key: "book", label: "Book value", numeric: true },
      ]}
      emptyTitle="No assets recorded"
      emptyHint="Asset registers and depreciation schedules are an accounting feature, not part of the invoicing API."
    />
  );
}
