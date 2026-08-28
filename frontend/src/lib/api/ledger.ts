import { apiFetch } from "@/lib/api/client";
import type { PaymentListItem, StoredDocument } from "@/types/api";

/** Every payment recorded for the company, newest first. */
export async function listPayments() {
  return apiFetch<PaymentListItem[]>("/payments");
}

/** Generated invoice PDFs and XRechnung XML stored for the company. */
export async function listDocuments() {
  return apiFetch<StoredDocument[]>("/documents");
}
