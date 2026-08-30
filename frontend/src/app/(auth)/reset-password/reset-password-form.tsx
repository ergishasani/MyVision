"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useT } from "@/components/providers/locale-provider";
import { ApiError } from "@/lib/api/client";
import { resetPassword } from "@/lib/api/auth";
import { AuthFormIcon, LockIcon } from "@/components/auth/auth-form-icon";
import { AuthFormHeader, AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  const r = useT().resetPassword;
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError(r.invalidLink);
      return;
    }

    if (password !== confirmPassword) {
      setError(r.mismatch);
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, password);
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : r.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <AuthFormIcon>
        <LockIcon />
      </AuthFormIcon>

      <AuthFormHeader
        title={r.title}
        description={r.description}
      />

      {!token ? (
        <div className="space-y-4">
          <p className="text-sm text-red-600">
            This reset link is invalid or has expired.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex text-sm font-medium text-primary hover:underline"
          >
            Request a new reset link
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password">{r.newPassword}</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder={r.passwordPlaceholder}
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{r.confirmPassword}</Label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              placeholder={r.passwordPlaceholder}
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
            {loading ? r.submitting : r.submit}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-muted">
        Remember password?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign In
        </Link>
      </p>

      <div className="mt-8 rounded-2xl bg-slate-100 px-4 py-3 text-center text-xs text-muted">
        Create a strong password to secure your account
      </div>
    </AuthSplitLayout>
  );
}
