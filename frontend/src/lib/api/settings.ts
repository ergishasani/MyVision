import { apiFetch } from "@/lib/api/client";
import type {
  BookingAccount,
  CostCenter,
  NumberRange,
  NumberRangeType,
  TeamMember,
} from "@/types/api";

// --- number ranges ---------------------------------------------------------

export async function listNumberRanges() {
  return apiFetch<NumberRange[]>("/settings/accounting/number-ranges");
}

/**
 * Edits one counter.
 *
 * <p>The API rejects a `nextNumber` lower than the current one. That is deliberate: the number
 * has already gone out on a document, and reissuing it is a compliance problem.
 */
export async function updateNumberRange(
  type: NumberRangeType,
  patch: { format?: string; padding?: number; nextNumber?: number },
) {
  return apiFetch<NumberRange>(`/settings/accounting/number-ranges/${type}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// --- booking accounts ------------------------------------------------------

export type BookingAccountInput = {
  displayName: string;
  name?: string | null;
  skrAccount?: string | null;
};

export async function listBookingAccounts() {
  return apiFetch<BookingAccount[]>("/settings/accounting/booking-accounts");
}

export async function createBookingAccount(input: BookingAccountInput) {
  return apiFetch<BookingAccount>("/settings/accounting/booking-accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteBookingAccount(id: string) {
  return apiFetch<void>(`/settings/accounting/booking-accounts/${id}`, { method: "DELETE" });
}

// --- cost centres ----------------------------------------------------------

export type CostCenterInput = {
  name: string;
  number?: string | null;
};

export async function listCostCenters() {
  return apiFetch<CostCenter[]>("/settings/accounting/cost-centers");
}

export async function createCostCenter(input: CostCenterInput) {
  return apiFetch<CostCenter>("/settings/accounting/cost-centers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteCostCenter(id: string) {
  return apiFetch<void>(`/settings/accounting/cost-centers/${id}`, { method: "DELETE" });
}

// --- team ------------------------------------------------------------------

export async function listTeamMembers() {
  return apiFetch<TeamMember[]>("/settings/team/members");
}

export async function updateTeamMemberRole(id: string, role: TeamMember["role"]) {
  return apiFetch<TeamMember>(`/settings/team/members/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

export async function removeTeamMember(id: string) {
  return apiFetch<void>(`/settings/team/members/${id}`, { method: "DELETE" });
}
