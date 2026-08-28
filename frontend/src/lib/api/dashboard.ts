import { apiFetch } from "@/lib/api/client";
import type { Client, DashboardSummary } from "@/types/api";

export async function getDashboardSummary() {
  return apiFetch<DashboardSummary>("/dashboard/summary");
}

export async function listClients() {
  return apiFetch<Client[]>("/clients");
}
