"use client";

import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";

export default function BwaPage() {
  const p = useT().pages.bwa;

  return (
    <PageShell
      title={p.title}
      description={p.description}
      columns={[
        { key: "line", label: p.columns.line },
        { key: "current", label: p.columns.current, numeric: true },
        { key: "previous", label: p.columns.previous, numeric: true },
        { key: "change", label: p.columns.change, numeric: true },
      ]}
      emptyTitle={p.emptyTitle}
      emptyHint={p.emptyHint}
    />
  );
}
