import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthLogo } from "@/components/auth/auth-logo";
import Link from "next/link";
import type { ReactNode } from "react";

export function AuthSplitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex min-h-screen flex-col bg-white">
        <header className="px-8 py-8 lg:px-12 xl:px-16">
          <AuthLogo />
        </header>

        <main className="flex flex-1 flex-col justify-center px-8 pb-8 lg:px-12 xl:px-16">
          <div className="mx-auto w-full max-w-md">{children}</div>
        </main>

        <footer className="flex flex-col gap-2 px-8 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between lg:px-12 xl:px-16">
          <p>Copyright &copy; {new Date().getFullYear()} MyVision Enterprises LTD.</p>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
        </footer>
      </div>

      <AuthBrandPanel />
    </div>
  );
}

export function AuthFormHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted">{description}</p>
    </div>
  );
}
