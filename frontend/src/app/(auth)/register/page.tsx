"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useT } from "@/components/providers/locale-provider";
import { ApiError } from "@/lib/api/client";
import { register } from "@/lib/api/auth";
import { AuthFormHeader, AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { AuthSocialSection } from "@/components/auth/auth-social-section";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register({
        fullName,
        companyName: companyName.trim() || undefined,
        email,
        password,
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.auth.register.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <AuthFormHeader
        title={t.auth.register.title}
        description={t.auth.register.description}
      />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="fullName">{t.auth.register.fullName}</Label>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder={t.auth.register.fullNamePlaceholder}
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">
            {t.auth.register.companyName}{" "}
            <span className="text-muted">{t.auth.register.optional}</span>
          </Label>
          <Input
            id="companyName"
            autoComplete="organization"
            placeholder={t.auth.register.companyPlaceholder}
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </div>

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
            autoComplete="new-password"
            placeholder={t.auth.register.passwordPlaceholder}
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
          {loading ? t.auth.register.submitting : t.auth.register.submit}
        </Button>
      </form>

      <AuthSocialSection
        label={t.auth.register.socialLabel}
        companyName={companyName}
        onError={setError}
      />

      <p className="mt-8 text-center text-sm text-muted">
        {t.auth.register.haveAccount}{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          {t.auth.register.logIn}
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
