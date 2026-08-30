"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useT } from "@/components/providers/locale-provider";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/auth";
import { getRememberedEmail, persistRememberedEmail } from "@/lib/auth/remember-email";
import { AuthFormHeader, AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { AuthSocialSection } from "@/components/auth/auth-social-section";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const t = useT();
  const router = useRouter();
  const rememberedEmail = getRememberedEmail();
  const [email, setEmail] = useState(rememberedEmail ?? "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedEmail));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      persistRememberedEmail(email, rememberMe);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.auth.login.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <AuthFormHeader
        title={t.auth.login.title}
        description={t.auth.login.description}
      />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">{t.auth.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder={t.auth.emailPlaceholder}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t.auth.password}</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder={t.auth.login.passwordPlaceholder}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            {t.auth.login.rememberMe}
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary hover:underline"
          >
            {t.auth.login.forgotPassword}
          </Link>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
          {loading ? t.auth.login.submitting : t.auth.login.submit}
        </Button>
      </form>

      <AuthSocialSection onError={setError} />

      <p className="mt-8 text-center text-sm text-muted">
        {t.auth.login.noAccount}{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          {t.auth.login.registerNow}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
