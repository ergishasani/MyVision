"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { register } from "@/lib/api/auth";
import { AuthFormHeader, AuthSplitLayout } from "@/components/auth/auth-split-layout";
import { AuthSocialSection } from "@/components/auth/auth-social-section";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
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
      setError(err instanceof ApiError ? err.message : "Unable to create account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout>
      <AuthFormHeader
        title="Create Your Account"
        description="Enter your details to register your company and start managing projects."
      />

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            autoComplete="name"
            placeholder="John Smith"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="companyName">
            Company Name <span className="text-muted">(Optional)</span>
          </Label>
          <Input
            id="companyName"
            autoComplete="organization"
            placeholder="Acme Construction Ltd."
            value={companyName}
            onChange={(event) => setCompanyName(event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </Button>
      </form>

      <AuthSocialSection
        label="Or Register With"
        companyName={companyName}
        onError={setError}
      />

      <p className="mt-8 text-center text-sm text-muted">
        Already Have An Account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log In.
        </Link>
      </p>
    </AuthSplitLayout>
  );
}
