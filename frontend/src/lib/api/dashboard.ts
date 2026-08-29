import { apiFetch } from "@/lib/api/client";
import type {
  Client,
  DashboardActivity,
  DashboardOverview,
  DashboardSummary,
} from "@/types/api";

export async function getDashboardSummary() {
  return apiFetch<DashboardSummary>("/dashboard/summary");
}

export async function listClients() {
  return apiFetch<Client[]>("/clients");
}

/**
 * Everything the overview screen shows, in one call.
 *
 * <p>`revenueMonths` sizes the chart; `breakdownMonths` sizes the customer and line rankings,
 * which the screen lets the operator change on their own.
 */
export async function getDashboardOverview(revenueMonths = 12, breakdownMonths = 3) {
  const query = new URLSearchParams({
    revenueMonths: String(revenueMonths),
    breakdownMonths: String(breakdownMonths),
  });
  return apiFetch<DashboardOverview>(`/dashboard/overview?${query}`);
}

/** One page of the audit trail, newest first. */
export async function getDashboardActivity(page = 0, size = 5) {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return apiFetch<DashboardActivity>(`/dashboard/activity?${query}`);
}
