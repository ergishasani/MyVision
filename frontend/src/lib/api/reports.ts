import { apiFetch } from "@/lib/api/client";
import type { VatReport, VatReturn } from "@/types/api";

/**
 * VAT invoiced across a period, split by rate.
 *
 * <p>Computed from issued invoices. Engineering output, not tax advice.
 */
export async function getVatReport(from: string, to: string) {
  return apiFetch<VatReport>(`/reports/vat?from=${from}&to=${to}`);
}

/**
 * The same period arranged as the advance-return form (UStVA).
 *
 * <p>Engineering output, not a filing. `payable` comes back null because deductible input tax has
 * no source in this system — see the note on the response type.
 */
export async function getVatReturn(from: string, to: string) {
  return apiFetch<VatReturn>(`/reports/vat-return?from=${from}&to=${to}`);
}
