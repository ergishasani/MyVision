"use client";

import { Suspense } from "react";
import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";
import { AuthFormHeader, AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { useT } from "@/components/providers/locale-provider";

function ResetPasswordFallback() {
  const t = useT();
  return (
    <AuthSplitLayout>
      <AuthFormHeader
        title={t.auth.reset.title}
        description={t.auth.reset.loading}
      />
    </AuthSplitLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
