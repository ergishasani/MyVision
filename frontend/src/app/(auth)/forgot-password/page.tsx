"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { forgotPassword } from "@/lib/api/auth";
import { AuthEmailInput } from "@/components/auth/auth-email-input";
import { AuthFormIcon, LinkIcon, LockIcon } from "@/components/auth/auth-form-icon";
import { AuthFormHeader, AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await forgotPassword(email);
      setSuccess(response.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to send reset link");
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
        title="Forgot Your Password?"
        description="Enter your registered email address, and we'll send you a link to reset your password."
      />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <AuthEmailInput
            id="email"
            autoComplete="email"
            placeholder="Enter email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <Button type="submit" className="h-11 w-full gap-2 text-base" disabled={loading || Boolean(success)}>
          <LinkIcon />
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Remember password?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign In
        </Link>
      </p>

      <div className="mt-8 rounded-full bg-slate-100 px-4 py-3 text-center text-xs text-muted">
        Your data is protected with industry-grade encryption
      </div>
    </AuthSplitLayout>
  );
}
