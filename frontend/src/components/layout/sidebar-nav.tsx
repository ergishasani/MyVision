"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearSession, getSession } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/projects", label: "Projects" },
  { href: "/quotes", label: "Quotes" },
  { href: "/invoices", label: "Invoices" },
  { href: "/payments", label: "Payments" },
  { href: "/documents", label: "Documents" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
  { href: "/admin", label: "Admin" },
];

export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="border-b border-slate-800 px-6 py-5">
        <p className="text-lg font-semibold">MyVision</p>
        <p className="mt-1 truncate text-sm text-sidebar-muted">
          {session?.company.name ?? "Your company"}
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-active text-white"
                  : "text-sidebar-muted hover:bg-sidebar-active hover:text-white",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <p className="truncate text-sm font-medium">
          {session?.user.fullName ?? "Signed in user"}
        </p>
        <p className="truncate text-xs text-sidebar-muted">
          {session?.user.email}
        </p>
        <Button
          variant="ghost"
          className="mt-3 w-full justify-start px-0 text-sidebar-muted hover:bg-transparent hover:text-white"
          onClick={handleLogout}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
