import { apiFetch } from "@/lib/api/client";
import type { Client, DiscountUnit } from "@/types/api";

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

/** Soft delete: the backend sets archivedAt rather than removing the row. */
export async function deleteClient(id: string) {
  return apiFetch<void>(`/clients/${id}`, { method: "DELETE" });
}

/** The number the next contact would get, for pre-filling the create form. */
export async function peekNextCustomerNumber() {
  const body = await apiFetch<{ nextCustomerNumber: number }>("/clients/next-number");
  return body.nextCustomerNumber;
}
