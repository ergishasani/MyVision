"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { listTeamMembers, removeTeamMember, updateTeamMemberRole } from "@/lib/api/settings";
import type { CompanyMemberRole, TeamMember } from "@/types/api";
import { formatDate } from "@/lib/utils/format";
import { useT } from "@/components/providers/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";

/** Stored role values. Their wording comes from the dictionary. */
const ROLE_VALUES: CompanyMemberRole[] = ["owner", "admin", "member", "accountant"];

const roles = (t: Dictionary["team"]) =>
  ROLE_VALUES.map((value) => ({
    value,
    label: t.roles[value].label,
    description: t.roles[value].description,
  }));

function initials(member: TeamMember) {
  const source = member.fullName?.trim() || member.email;
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** A sentence with the member's name emphasised inside it. See the contacts page for why. */
function NamedSentence({ template, name }: { template: string; name: string }) {
  const [before, after] = template.split("{name}");
  return (
    <>
      {before}
      <span className="font-medium text-foreground">{name}</span>
      {after}
    </>
  );
}

export default function TeamSettingsPage() {
  const c = useT().team;
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<TeamMember | null>(null);

  useEffect(() => {
    listTeamMembers()
      .then(setMembers)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : c.loadError),
      )
      .finally(() => setLoading(false));
    // The dictionary is only read for the failure message; re-running on a language switch
    // would refetch the member list for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeRole(member: TeamMember, role: CompanyMemberRole) {
    const previous = members;
    // Optimistic, then rolled back if the API refuses — it enforces that a company keeps an owner.
    setMembers((list) => list.map((m) => (m.id === member.id ? { ...m, role } : m)));
    setError(null);
    try {
      const updated = await updateTeamMemberRole(member.id, role);
      setMembers((list) => list.map((m) => (m.id === updated.id ? updated : m)));
    } catch (err) {
      setMembers(previous);
      setError(err instanceof ApiError ? err.message : c.roleError);
    }
  }

  async function remove(member: TeamMember) {
    setConfirmRemove(null);
    const previous = members;
    setMembers((list) => list.filter((m) => m.id !== member.id));
    try {
      await removeTeamMember(member.id);
    } catch (err) {
      setMembers(previous);
      setError(err instanceof ApiError ? err.message : c.removeError);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{c.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {c.description}
          </p>
        </div>
      </header>

      {error ? (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div>
            <p className="text-sm font-medium text-red-700">{c.errorHeading}</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-sm font-medium text-red-700 hover:underline"
          >
            {c.dismiss}
          </button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/70">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.colName}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.colEmail}</th>
                <th scope="col" className="w-48 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.colRole}</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">{c.colLastSignIn}</th>
                <th scope="col" className="w-24 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">{c.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-sm text-muted">
                    Loading team…
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-b border-border last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
                          {initials(member)}
                        </span>
                        <span>
                          <span className="block font-medium text-foreground">
                            {member.fullName || "—"}
                          </span>
                          {/* An unverified address cannot receive a password reset, which is
                              worth surfacing before someone is locked out. */}
                          {!member.emailVerified ? (
                            <span className="text-xs text-amber-700">{c.emailNotVerified}</span>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{member.email}</td>
                    <td className="px-4 py-3">
                      <select
                        value={member.role}
                        aria-label={`Role for ${member.fullName || member.email}`}
                        onChange={(event) =>
                          changeRole(member, event.target.value as CompanyMemberRole)
                        }
                        className="h-9 w-full rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
                      >
                        {roles(c).map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {member.lastLoginAt ? formatDate(member.lastLoginAt) : c.never}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(member)}
                        className="rounded-md px-2 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        {c.remove}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground">{c.rolesHeading}</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {roles(c).map((role) => (
            <div key={role.value} className="rounded-lg border border-border p-3">
              <dt className="text-sm font-medium text-foreground">{role.label}</dt>
              <dd className="mt-0.5 text-sm text-muted">{role.description}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">
          {c.ownerNote}
        </p>
        <p className="mt-2 text-sm text-muted">
          {c.inviteNote}
        </p>
      </section>

      {confirmRemove ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={c.cancel}
            onClick={() => setConfirmRemove(null)}
            className="fixed inset-0 cursor-default bg-slate-900/40"
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className={cn(
              "relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl",
            )}
          >
            <h2 className="text-lg font-semibold text-foreground">{c.confirmTitle}</h2>
            <p className="mt-2 text-sm text-muted">
              <NamedSentence
                template={c.confirmBody}
                name={confirmRemove.fullName || confirmRemove.email}
              />
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemove(null)}
                className="h-10 rounded-lg px-4 text-sm font-medium text-foreground hover:bg-slate-100"
              >
                {c.cancel}
              </button>
              <button
                type="button"
                onClick={() => remove(confirmRemove)}
                className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700"
              >
                {c.remove}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
