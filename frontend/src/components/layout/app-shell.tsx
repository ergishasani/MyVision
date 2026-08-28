"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { getSession } from "@/lib/auth/session";
import { SidebarNav } from "@/components/layout/sidebar-nav";

const emptySubscribe = () => () => {};

function useHasSession() {
  return useSyncExternalStore(
    emptySubscribe,
    () => Boolean(getSession()),
    () => false,
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hasSession = useHasSession();

  useEffect(() => {
    if (!hasSession) {
      router.replace("/login");
    }
  }, [hasSession, router]);

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">Loading workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
