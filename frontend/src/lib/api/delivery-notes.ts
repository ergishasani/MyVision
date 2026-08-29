import { apiFetch } from "@/lib/api/client";
import type { DeliveryNote } from "@/types/api";

export type DeliveryNoteItemInput = {
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice?: number | null;
  taxRate?: number | null;
  discountAmount?: number | null;
};

export type DeliveryNoteInput = {
  clientId: string;
  projectId?: string | null;
  invoiceId?: string | null;
  quoteId?: string | null;
  subject?: string | null;
  deliveryDate?: string | null;
  reference?: string | null;
  deliveryAddressLine1?: string | null;
  deliveryAddressLine2?: string | null;
  deliveryPostalCode?: string | null;
  deliveryCity?: string | null;
  deliveryRegion?: string | null;
  deliveryCountryCode?: string | null;
  currency?: string | null;
  discountAmount?: number | null;
  headerText?: string | null;
  footerText?: string | null;
  items: DeliveryNoteItemInput[];
};

export async function listDeliveryNotes() {
  return apiFetch<DeliveryNote[]>("/delivery-notes");
}

export async function getDeliveryNote(id: string) {
  return apiFetch<DeliveryNote>(`/delivery-notes/${id}`);
}

export async function createDeliveryNote(input: DeliveryNoteInput) {
  return apiFetch<DeliveryNote>("/delivery-notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Only a draft can be edited — once sent, the note is a record of what the customer was told. */
export async function updateDeliveryNote(id: string, patch: Partial<DeliveryNoteInput>) {
  return apiFetch<DeliveryNote>(`/delivery-notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function markDeliveryNoteSent(id: string) {
  return apiFetch<DeliveryNote>(`/delivery-notes/${id}/mark-sent`, { method: "POST" });
}

export async function markDeliveryNoteDelivered(id: string) {
  return apiFetch<DeliveryNote>(`/delivery-notes/${id}/mark-delivered`, { method: "POST" });
}

export async function cancelDeliveryNote(id: string) {
  return apiFetch<DeliveryNote>(`/delivery-notes/${id}/cancel`, { method: "POST" });
}

/** A preview. The real number is allocated server-side on save. */
export async function peekNextDeliveryNoteNumber() {
  const body = await apiFetch<{ nextNumber?: string }>("/delivery-notes/next-number");
  return body.nextNumber ?? null;
}
