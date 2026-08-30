"use client";

import { SectionPlaceholder } from "@/components/layout/section-placeholder";
import { useT } from "@/components/providers/locale-provider";

export default function VerifyEmailPage() {
  const t = useT();
  return (
    <SectionPlaceholder
      title={t.auth.verify.title}
      description={t.auth.verify.description}
    />
  );
}
