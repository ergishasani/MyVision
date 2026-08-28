import { Suspense } from "react";
import { ResetPasswordForm } from "@/app/(auth)/reset-password/reset-password-form";
import { AuthFormHeader, AuthSplitLayout } from "@/components/auth/auth-split-layout";

function ResetPasswordFallback() {
  return (
    <AuthSplitLayout>
      <AuthFormHeader
        title="Reset Your Password"
        description="Loading your reset link..."
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
