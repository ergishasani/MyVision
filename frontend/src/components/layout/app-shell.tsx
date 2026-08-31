"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { AuthGuard } from "@/components/layout/auth-guard";
import { MobileTopBar, SidebarNav } from "@/components/layout/sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Only meaningful below `lg`, where the sidebar is a drawer over the page rather than a column
  // beside it. The sidebar itself ignores this at desktop widths.
  const [navOpen, setNavOpen] = useState(false);
  const [navPath, setNavPath] = useState(pathname);

  // The drawer covers the page, so it must not survive a navigation — including a redirect or a
  // back gesture, which no click handler in the nav would see. Adjusted during render rather than
  // from an effect, so the drawer is already gone the first time the new page paints.
  if (navPath !== pathname) {
    setNavPath(pathname);
    setNavOpen(false);
  }

  return (
    <AuthGuard>
      {/* The document itself scrolls here: no viewport-height wrapper, no nested scroll container.
          That is the whole point of this arrangement. Mobile Safari only collapses its toolbar on
          scroll, and only lets content run underneath it, when the *page* is what scrolled —
          scrolling inside a child element leaves the browser chrome sitting at full height
          forever, eating the bottom of the screen.

          The sidebar can still hold its position through all of that because it is `fixed` at
          every width; the content column is inset by its width from `lg` up rather than sitting
          beside it in a flex row. */}
      <div className="bg-background">
        <SidebarNav open={navOpen} onClose={() => setNavOpen(false)} />

        <div className="lg:pl-[250px]">
          <MobileTopBar onOpen={() => setNavOpen(true)} />

          {/* `relative` is load-bearing, not decoration. Tailwind's `sr-only` is position:absolute,
              and without a positioned ancestor its containing block is the initial containing
              block, which drops every off-screen screen-reader label at the page origin and
              stretches the document out from under itself.

              Near full width. The cap only bites on ultrawide displays, where a table stretched
              across 3000px becomes hard to read across a row. The bottom inset adds to the padding
              rather than replacing it, so the last row of a table clears the home indicator
              instead of sitting under it. */}
          <main className="relative mx-auto w-full max-w-[1800px] px-6 pt-7 pb-[calc(1.75rem_+_env(safe-area-inset-bottom))] xl:px-8">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
