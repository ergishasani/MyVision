"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function FacilitiesPage() {
  const p = useT().pages.evidenceFacilities;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      tabs={[p.tabs.all, p.tabs.inUse, p.tabs.disposed]}
      columns={[
        { key: "asset", label: p.columns.asset },
        { key: "acquired", label: p.columns.acquired },
        { key: "cost", label: p.columns.cost, numeric: true },
        { key: "depreciation", label: p.columns.depreciation, numeric: true },
        { key: "book", label: p.columns.book, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
