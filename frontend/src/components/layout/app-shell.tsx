"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getSession, subscribeToSession } from "@/lib/auth/session";
import { SidebarNav } from "@/components/layout/sidebar-nav";

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
    // The shell is exactly one viewport tall and never scrolls itself, so the sidebar stays put
    // however long the page is — `min-h-screen` let the whole window scroll instead, carrying the
    // nav off the top of a tall page. Bounding the height here is also what finally lets the
    // sidebar's own overflow work: a flex child can only scroll inside a parent with a height.
    // `dvh` rather than `vh` so mobile browser chrome does not push the bottom out of reach.
    <div className="flex h-dvh overflow-hidden bg-background">
      <SidebarNav />
      {/* `relative` is load-bearing, not decoration. Tailwind's `sr-only` is position:absolute,
          and without a positioned ancestor its containing block is the initial containing block —
          so `overflow-y-auto` here could not clip it, and every off-screen screen-reader label
          stretched <html> past the viewport. That gave the document a second scrollbar and left a
          band of empty background under the shell. Making this the containing block clips them. */}
      <main className="relative flex-1 overflow-y-auto">
        {/* Near full width. The cap only bites on ultrawide displays, where a table
            stretched across 3000px becomes hard to read across a row. */}
        <div className="mx-auto w-full max-w-[1800px] px-6 py-7 xl:px-8">{children}</div>
      </main>
    </div>
  );
}
