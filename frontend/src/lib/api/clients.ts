import { apiFetch } from "@/lib/api/client";
import type { Client, ClientOverview, DiscountUnit } from "@/types/api";

export type ContactDetailInput = {
  kind: "phone" | "email" | "website";
  label: string;
  value: string;
};

export type ClientInput = {
  type: "business" | "individual";
  name: string;
  contactName?: string | null;
  salutation?: string | null;
  academicTitle?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  nameSuffix?: string | null;
  position?: string | null;
  contactRole?: string;
  customerNumber?: number | null;
  debtorNumber?: string | null;
  creditorNumber?: string | null;
  contactDetails?: ContactDetailInput[];
  iban?: string | null;
  bic?: string | null;
  taxNumber?: string | null;
  showVatId?: boolean;
  einvoiceStandard?: boolean;
  paymentTermsDays?: number | null;
  discountDays?: number | null;
  discountPercent?: number | null;
  customerDiscount?: number | null;
  customerDiscountUnit?: DiscountUnit;
  terms?: string | null;
  email?: string | null;
  phone?: string | null;
  vatNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  notes?: string | null;
};

export async function listClients() {
  return apiFetch<Client[]>("/clients");
}

export async function getClient(id: string) {
  return apiFetch<Client>(`/clients/${id}`);
}

/**
 * The contact plus their billing history and totals, for the detail screen.
 *
 * <p>One call rather than four so the headline figures cannot disagree with the rows under them.
 */
export async function getClientOverview(id: string) {
  return apiFetch<ClientOverview>(`/clients/${id}/overview`);
}

export async function createClient(input: ClientInput) {
  return apiFetch<Client>("/clients", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateClient(id: string, patch: Partial<ClientInput>) {
  return apiFetch<Client>(`/clients/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Hides the contact. The row stays, because documents still point at it. */
export async function archiveClient(id: string) {
  return apiFetch<void>(`/clients/${id}`, { method: "DELETE" });
}

/**
 * Removes the contact for good.
 *
 * <p>Rejected with 400 while any invoice, quote or project still references them — an invoice has
 * to keep the contact it was issued to.
 */
export async function deleteClient(id: string) {
  return apiFetch<void>(`/clients/${id}/permanent`, { method: "DELETE" });
}

/** The number the next contact would get, for pre-filling the create form. */
export async function peekNextCustomerNumber() {
  const body = await apiFetch<{ nextCustomerNumber: number }>("/clients/next-number");
  return body.nextCustomerNumber;
}
