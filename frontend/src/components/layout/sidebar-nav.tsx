"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/providers/locale-provider";
import { clearSession, getSession } from "@/lib/auth/session";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------------------------------------------------
 * Icons. Inline rather than a dependency: the set is small and fixed.
 * ------------------------------------------------------------------------ */

type IconProps = { className?: string };

function icon(path: React.ReactNode) {
  return function Icon({ className }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
      >
        {path}
      </svg>
    );
  };
}

const HomeIcon = icon(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>);
const UsersIcon = icon(<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M17 11a3 3 0 1 0-1.5-5.6" /><path d="M17.5 20a5.6 5.6 0 0 0-2-4.3" /></>);
const InvoiceIcon = icon(<><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-3-2Z" /><path d="M9 8h6" /><path d="M9 12h6" /></>);
const ArchiveIcon = icon(<><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" /><path d="M10 12h4" /></>);
const ChartIcon = icon(<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M3 20h18" /></>);
const CogIcon = icon(<><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" /></>);
const SearchIcon = icon(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>);
const DotsIcon = icon(<><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></>);
const MailIcon = icon(<><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="m3 6.5 9 6.5 9-6.5" /></>);
const BankIcon = icon(<><path d="M3 10h18" /><path d="m12 3 9 5H3Z" /><path d="M6 10v8M10 10v8M14 10v8M18 10v8" /><path d="M3 21h18" /></>);
const PercentIcon = icon(<><circle cx="12" cy="12" r="9" /><path d="m9 15 6-6" /><circle cx="9.2" cy="9.2" r="1.1" /><circle cx="14.8" cy="14.8" r="1.1" /></>);
const BoxIcon = icon(<><path d="m3 8 9-5 9 5v8l-9 5-9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></>);
const GridIcon = icon(<><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>);
const GiftIcon = icon(<><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" /><path d="M12 8v13" /><path d="M12 8S10.5 3 8 4s.5 4 4 4 4.5-3 2-4-2 4-2 4" /></>);

type NavChild = { href: string; label: string };

type NavItem = {
  href: string;
  label: string;
  Icon: (props: IconProps) => React.ReactElement;
  children?: NavChild[];
};

const primaryNav = (t: Dictionary): NavItem[] => [
  { href: "/dashboard", label: t.nav.overview, Icon: HomeIcon },
  {
    // Opening Orders lands on Offers, because that is the section's real work — the other two
    // screens are downstream of an offer existing. /orders itself redirects here.
    href: "/quotes",
    label: t.nav.orders,
    Icon: MailIcon,
    children: [
      // "Offers" is the customer-facing word; the route stays /quotes, which is what the API and
      // every existing link already call them.
      { href: "/quotes", label: t.nav.offers },
      { href: "/orders/confirmations", label: t.nav.orderConfirmations },
      { href: "/orders/delivery-notes", label: t.nav.deliveryNotes },
    ],
  },
  {
    href: "/invoices",
    label: t.nav.invoices,
    Icon: InvoiceIcon,
    children: [
      { href: "/invoices", label: t.nav.allInvoices },
      { href: "/invoices/recurring", label: t.nav.invoicesRecurring },
      { href: "/invoices/reminders", label: t.nav.reminders },
      { href: "/invoices/credits", label: t.nav.credits },
    ],
  },
  {
    href: "/evidence",
    label: t.nav.evidence,
    Icon: ArchiveIcon,
    children: [
      { href: "/documents", label: t.nav.documents },
      { href: "/evidence/recurring", label: t.nav.evidenceRecurring },
      { href: "/evidence/facilities", label: t.nav.facilities },
    ],
  },
  {
    href: "/bank",
    label: t.nav.bank,
    Icon: BankIcon,
    children: [
      { href: "/payments", label: t.nav.transactions },
      { href: "/bank/cash-book", label: t.nav.cashBook },
      { href: "/bank/incomplete", label: t.nav.incomplete },
    ],
  },
  {
    href: "/steer",
    label: t.nav.taxes,
    Icon: PercentIcon,
    children: [
      { href: "/steer/constitution", label: t.nav.constitution },
      // UStVA, the advance VAT return, is backed by /api/reports/vat.
      { href: "/reports/taxes", label: t.nav.vatReturn },
      { href: "/steer/tax-advisor", label: t.nav.taxAdvisor },
    ],
  },
  {
    href: "/evaluations",
    label: t.nav.evaluations,
    Icon: ChartIcon,
    children: [
      { href: "/reports", label: t.nav.reports },
      { href: "/evaluations/susa", label: t.nav.trialBalance },
      { href: "/evaluations/bwa", label: t.nav.managementReport },
    ],
  },
];

const adminNav = (t: Dictionary): NavItem[] => [
  // Contact is the client list under sevdesk's naming.
  { href: "/clients", label: t.nav.contact, Icon: UsersIcon },
  { href: "/products", label: t.nav.products, Icon: BoxIcon },
  {
    href: "/extensions",
    label: t.nav.extensions,
    Icon: GridIcon,
    children: [
      { href: "/extensions/add-ons", label: t.nav.addOns },
      { href: "/settings/integrations", label: t.nav.integrations },
      { href: "/extensions/api", label: t.nav.api },
    ],
  },
  {
    href: "/settings",
    label: t.nav.settings,
    Icon: CogIcon,
    children: [
      // First in the list because it holds the interface language, which is what someone who
      // cannot read the rest of this menu is looking for.
      { href: "/settings/general", label: t.nav.general },
      { href: "/settings/team", label: t.nav.users },
      { href: "/settings/accounting", label: t.nav.accounting },
      // Was "Pursue", a machine translation of Unternehmen.
      { href: "/settings/company", label: t.nav.company },
      { href: "/admin/system-health", label: t.nav.system },
      { href: "/settings/stationery", label: t.nav.stationery },
      { href: "/settings/text-templates", label: t.nav.textTemplates },
    ],
  },
];

export function SidebarNav() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const session = getSession();
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  // The badge promises Ctrl/⌘+K, so it has to actually do something.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!openMenu) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openMenu]);

  const filter = query.trim().toLowerCase();

  /**
   * Whether the current page belongs to this section.
   *
   * <p>Children count, not just the section's own href. Several sections link to routes outside
   * their own prefix — Orders opens on /quotes, Evidence lists /documents, Evaluations lists
   * /reports — and matching on the parent path alone left the sidebar with nothing highlighted on
   * exactly those pages.
   */
  function inSection(item: NavItem) {
    const matches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    return matches(item.href) || (item.children?.some((child) => matches(child.href)) ?? false);
  }

  function visible(items: NavItem[]) {
    if (!filter) return items;
    return items
      .map((item) => {
        if (item.label.toLowerCase().includes(filter)) return item;
        const kids = item.children?.filter((c) => c.label.toLowerCase().includes(filter));
        return kids && kids.length > 0 ? { ...item, children: kids } : null;
      })
      .filter((item): item is NavItem => item !== null);
  }

  function renderItems(items: NavItem[]) {
    return visible(items).map((item) => {
      const active = inSection(item);
      // No chevrons: the section containing the current route is simply open, which is how the
      // reference behaves. Searching opens matches so the hits are visible.
      const expanded = Boolean(item.children) && (active || Boolean(filter));

      return (
        <li key={item.href}>
          <Link
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-[0.9rem] transition-colors",
              active
                ? "font-semibold text-sidebar-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-active",
            )}
          >
            <item.Icon
              className={cn(
                "size-[19px] shrink-0",
                active ? "text-sidebar-foreground" : "text-sidebar-muted",
              )}
            />
            <span className="truncate">{item.label}</span>
          </Link>

          {item.children ? (
            /* Height animates via grid-template-rows 0fr -> 1fr, which needs no measured
               height and so works whatever the section contains. Children stay mounted so the
               collapse animates too; tabIndex keeps them out of the tab order while hidden. */
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                {/* The rail sits just left of the labels rather than at the panel edge, so the
                    marker reads as belonging to the item it points at. */}
                <ul
                  aria-hidden={!expanded}
                  className="my-0.5 ml-[1.65rem] border-l border-border"
                >
                  {item.children.map((child) => {
                    // Only the exact current page is marked. A parent section being open is not
                    // itself a selection.
                    const childActive = pathname === child.href;
                    return (
                      <li key={child.href} className="relative">
                        {childActive ? (
                          <span className="absolute -left-px inset-y-0 w-[2px] bg-sidebar-accent" />
                        ) : null}
                        <Link
                          href={child.href}
                          tabIndex={expanded ? undefined : -1}
                          aria-current={childActive ? "page" : undefined}
                          className={cn(
                            "block py-1.5 pl-4 pr-3 text-[0.875rem] transition-colors",
                            childActive
                              ? "font-medium text-sidebar-foreground"
                              : "text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground",
                          )}
                        >
                          {child.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}
        </li>
      );
    });
  }

  const primary = renderItems(primaryNav(t));
  const admin = renderItems(adminNav(t));

  const userName = session?.user.fullName ?? "Account";
  const companyName = session?.company.name ?? "Your company";
  const initial = userName.trim().charAt(0).toUpperCase() || "?";

  function handleLogout() {
    clearSession();
    router.replace("/login");
  }

  return (
    <aside className="flex w-[250px] shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Brand */}
      <div className="px-5 pb-5 pt-6">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <span className="grid size-7 place-items-center rounded-md bg-sidebar-accent">
            <ChartIcon className="size-4 text-white" />
          </span>
          <span className="text-[1.35rem] font-semibold tracking-tight text-sidebar-foreground">
            MyVision
          </span>
        </Link>
      </div>

      {/* Search with the shortcut badge */}
      <div className="px-4 pb-4">
        <label className="relative flex items-center">
          <span className="sr-only">{t.nav.search}</span>
          <SearchIcon className="pointer-events-none absolute left-3 size-[18px] text-sidebar-muted" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.nav.search}
            className="h-11 w-full rounded-xl border border-border bg-sidebar pl-10 pr-14 text-sm text-sidebar-foreground outline-none placeholder:text-sidebar-muted focus:border-sidebar-accent"
          />
          <kbd className="pointer-events-none absolute right-3 rounded border border-border px-1.5 py-0.5 text-[0.7rem] font-medium text-sidebar-muted">
            Ctrl+K
          </kbd>
        </label>
      </div>

      {/* min-h-0 is what actually lets this scroll: a flex child defaults to min-height:auto,
          so without it the list refuses to shrink below its content and pushes the sidebar
          taller than the viewport instead of scrolling inside it. */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <ul>{primary}</ul>

        {admin.length > 0 ? (
          <>
            <p className="px-3 pb-1 pt-6 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-sidebar-muted">
              Administer
            </p>
            <ul>{admin}</ul>
          </>
        ) : null}

        {primary.length === 0 && admin.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-sidebar-muted">
            Nothing matches “{query}”.
          </p>
        ) : null}
      </nav>

      {/* The 60 € figure is hardcoded to match the reference. Point it at a real programme, or
          change the amount, before this ships to customers. */}
      <Link
        href="/refer"
        className="mx-3 mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-[0.9rem] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-active"
      >
        <GiftIcon className="size-[19px] shrink-0 text-sidebar-muted" />
        <span className="flex-1">Refer a friend</span>
        <span className="rounded-full bg-sidebar-active px-2 py-0.5 text-xs font-medium text-sidebar-foreground">
          60&euro;
        </span>
      </Link>

      {/* Account */}
      <div ref={menuRef} className="relative border-t border-border px-3 py-3">
        {openMenu ? (
          <div className="absolute bottom-full left-3 right-3 mb-2 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg">
            <Link
              href="/settings/company"
              onClick={() => setOpenMenu(false)}
              className="block px-4 py-2 text-sm text-foreground hover:bg-sidebar-active"
            >
              Company data
            </Link>
            <Link
              href="/settings/team"
              onClick={() => setOpenMenu(false)}
              className="block px-4 py-2 text-sm text-foreground hover:bg-sidebar-active"
            >
              Team
            </Link>
            <Link
              href="/settings/security"
              onClick={() => setOpenMenu(false)}
              className="block px-4 py-2 text-sm text-foreground hover:bg-sidebar-active"
            >
              Security
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="mt-1 block w-full border-t border-border px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
            >
              Log out
            </button>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setOpenMenu((open) => !open)}
          aria-expanded={openMenu}
          className="flex w-full items-center gap-3 rounded-md p-1.5 text-left transition-colors hover:bg-sidebar-active"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent text-sm font-semibold text-white">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-sidebar-foreground">
              {userName}
            </span>
            <span className="block truncate text-xs text-sidebar-muted">{companyName}</span>
          </span>
          <DotsIcon className="size-4 shrink-0 text-sidebar-muted" />
        </button>
      </div>
    </aside>
  );
}
