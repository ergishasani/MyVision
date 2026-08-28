"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getSession } from "@/lib/auth/session";
import { SidebarNav } from "@/components/layout/sidebar-nav";

/**
 * Re-reads the session whenever another tab writes to storage, so signing out in one tab
 * redirects the others instead of leaving a dead shell on screen.
 */
function subscribeToSession(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

const neverChanges = () => () => {};

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const hasSession = useSyncExternalStore(
    subscribeToSession,
    () => Boolean(getSession()),
    () => false,
  );

  // localStorage does not exist during the server render, so the first client pass necessarily
  // reports "no session". Redirecting on that pass bounced authenticated users to /login on every
  // hard refresh. Gating on hydration lets the real session value settle first.
  const hydrated = useSyncExternalStore(
    neverChanges,
    () => true,
    () => false,
  );

  useEffect(() => {
    if (hydrated && !hasSession) {
      router.replace("/login");
    }
  }, [hydrated, hasSession, router]);

  const ready = useCallback(() => hydrated && hasSession, [hydrated, hasSession]);

  if (!ready()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">
          {hydrated ? "Redirecting to sign in..." : "Loading workspace..."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNav />
      <main className="flex-1 overflow-auto">
        {/* Near full width. The cap only bites on ultrawide displays, where a table
            stretched across 3000px becomes hard to read across a row. */}
        <div className="mx-auto w-full max-w-[1800px] px-6 py-7 xl:px-8">{children}</div>
      </main>
    </div>
  );
}
