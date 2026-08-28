import { apiFetch } from "@/lib/api/client";
import type { VatReport } from "@/types/api";

/**
 * VAT invoiced across a period, split by rate.
 *
 * <p>Computed from issued invoices. Engineering output, not tax advice.
 */
export async function getVatReport(from: string, to: string) {
  return apiFetch<VatReport>(`/reports/vat?from=${from}&to=${to}`);
}
