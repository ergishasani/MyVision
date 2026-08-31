import { AuthGuard } from "@/components/layout/auth-guard";

/**
 * Full-screen document editors.
 *
 * <p>No sidebar. Writing an invoice is a task you finish and leave, not a place you browse from,
 * and the reference design drops the navigation for exactly that reason — the document preview
 * needs the width, and a half-written invoice should not invite a click into another section.
 *
 * <p>A route group rather than a flag on the shared shell: the URL is unchanged (`/invoices/new`),
 * and the two layouts stay independent instead of one growing conditionals about the other.
 */
export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="h-dvh overflow-hidden bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {children}
      </div>
    </AuthGuard>
  );
}
