import { apiFetch } from "@/lib/api/client";
import type { Invoice } from "@/types/api";

export async function listInvoices() {
  return apiFetch<Invoice[]>("/invoices");
}

export async function getInvoice(id: string) {
  return apiFetch<Invoice>(`/invoices/${id}`);
}
