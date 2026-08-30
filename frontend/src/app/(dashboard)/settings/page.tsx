"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-shell";
import { useT } from "@/components/providers/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------------------------------------------------
 * Settings index.
 *
 * Twelve sections is past the point where a flat grid of cards is browsable, so they are grouped
 * and searchable. `ready` marks the sections that actually do something — the rest are routed but
 * still scaffolds, and saying so is better than letting someone click into an empty page and
 * wonder whether it failed to load.
 * ------------------------------------------------------------------------ */

type Group = keyof Dictionary["settings"]["groups"];
type SectionKey = keyof Dictionary["settings"]["sections"];

type Section = {
  key: SectionKey;
  href: string;
  group: Group;
  ready: boolean;
};

const SECTIONS: Section[] = [
  { key: "general", href: "/settings/general", group: "workspace", ready: true },
  { key: "company", href: "/settings/company", group: "business", ready: true },
  { key: "invoicing", href: "/settings/invoicing", group: "documents", ready: false },
  { key: "stationery", href: "/settings/stationery", group: "documents", ready: false },
  { key: "textTemplates", href: "/settings/text-templates", group: "documents", ready: false },
  { key: "email", href: "/settings/email", group: "documents", ready: false },
  { key: "taxes", href: "/settings/taxes", group: "finance", ready: false },
  { key: "accounting", href: "/settings/accounting", group: "finance", ready: true },
  { key: "billing", href: "/settings/billing", group: "finance", ready: false },
  { key: "team", href: "/settings/team", group: "workspace", ready: true },
  { key: "security", href: "/settings/security", group: "workspace", ready: false },
  { key: "integrations", href: "/settings/integrations", group: "workspace", ready: false },
];

const GROUP_ORDER: Group[] = ["business", "documents", "finance", "workspace"];

export default function SettingsPage() {
  const t = useT();
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return SECTIONS;
    return SECTIONS.filter((section) => {
      const copy = t.settings.sections[section.key];
      return (
        copy.title.toLowerCase().includes(needle) ||
        copy.description.toLowerCase().includes(needle)
      );
    });
  }, [query, t]);

  return (
    <div className="space-y-6">
      <PageHeader title={t.settings.title} description={t.settings.description} />

      <div className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.settings.searchPlaceholder}
          aria-label={t.settings.searchPlaceholder}
          className={cn(
            "h-10 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm text-foreground",
            "placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          )}
        />
      </div>

      {matches.length === 0 ? (
        <p className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted">
          {t.settings.noMatches}
        </p>
      ) : (
        GROUP_ORDER.map((group) => {
          const inGroup = matches.filter((section) => section.group === group);
          if (inGroup.length === 0) return null;

          return (
            <section key={group} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {t.settings.groups[group]}
              </h2>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {inGroup.map((section) => (
                  <SectionCard
                    key={section.key}
                    href={section.href}
                    ready={section.ready}
                    title={t.settings.sections[section.key].title}
                    description={t.settings.sections[section.key].description}
                    comingSoonLabel={t.settings.comingSoon}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

function SectionCard({
  href,
  ready,
  title,
  description,
  comingSoonLabel,
}: {
  href: string;
  ready: boolean;
  title: string;
  description: string;
  comingSoonLabel: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {ready ? (
          <ChevronRightIcon className="mt-0.5 size-4 shrink-0 text-muted" />
        ) : (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {comingSoonLabel}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{description}</p>
    </>
  );

  const shared = "block rounded-xl border border-border bg-card p-5 shadow-sm transition-colors";

  if (!ready) {
    return <div className={cn(shared, "opacity-70")}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(shared, "hover:border-primary/40 hover:bg-slate-50/70")}
    >
      {body}
    </Link>
  );
}

/* --- icons ---------------------------------------------------------------- */

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m10 6 6 6-6 6" />
    </svg>
  );
}
