"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { getSession, subscribeToSession } from "@/lib/auth/session";

const neverChanges = () => () => {};

/**
 * Renders its children only for a signed-in visitor, and sends everyone else to the login page.
 *
 * <p>Extracted so the sidebar shell and the full-screen editor share one implementation. The
 * hydration gate below is the fiddly part, and having two copies of it would mean fixing it twice.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
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

  if (!hydrated || !hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted">
          {hydrated ? "Redirecting to sign in..." : "Loading workspace..."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
