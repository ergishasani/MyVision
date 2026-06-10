"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { login } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900 text-white shadow-xl">
      <CardTitle>Sign in to MyVision</CardTitle>
      <CardDescription className="text-slate-400">
        Manage clients, projects, quotes, and invoices in one place.
      </CardDescription>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="border-slate-700 bg-slate-950 text-white"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="border-slate-700 bg-slate-950 text-white"
          />
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        No account yet?{" "}
        <Link href="/register" className="font-medium text-white hover:underline">
          Create one
        </Link>
      </p>
    </Card>
  );
}
