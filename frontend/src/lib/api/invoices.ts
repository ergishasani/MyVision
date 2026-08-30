import { ApiError, apiFetch, getApiBaseUrl } from "@/lib/api/client";
import { getToken } from "@/lib/auth/session";
import type { Invoice } from "@/types/api";

export async function listInvoices() {
  return apiFetch<Invoice[]>("/invoices");
}

export async function getInvoice(id: string) {
  return apiFetch<Invoice>(`/invoices/${id}`);
}

export type InvoiceItemInput = {
  description: string;
  quantity: number;
  unit?: string | null;
  unitPrice: number;
  taxRate?: number | null;
  discountAmount?: number | null;
};

export type InvoiceInput = {
  clientId: string;
  projectId?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  /** Sec. 14 UStG wants a date of supply, or the period below instead. */
  deliveryDate?: string | null;
  servicePeriodStart?: string | null;
  servicePeriodEnd?: string | null;
  subject?: string | null;
  reference?: string | null;
  taxScheme?: string | null;
  paymentMethod?: string | null;
  language?: string | null;
  costCenterId?: string | null;
  contactPersonUserId?: string | null;
  skontoDays?: number | null;
  skontoPercent?: number | null;
  eInvoice?: boolean;
  showCompanyName?: boolean;
  recipientEmail?: string | null;
  recipientName?: string | null;
  recipientAddressLine1?: string | null;
  recipientAddressLine2?: string | null;
  recipientPostalCode?: string | null;
  recipientCity?: string | null;
  recipientCountryCode?: string | null;
  currency?: string | null;
  discountAmount?: number | null;
  notes?: string | null;
  terms?: string | null;
  items: InvoiceItemInput[];
};

export async function createInvoice(input: InvoiceInput) {
  return apiFetch<Invoice>("/invoices", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function markInvoiceSent(id: string) {
  return apiFetch<Invoice>(`/invoices/${id}/mark-sent`, { method: "POST" });
}

/** The number the next invoice would receive. A preview; the real one is allocated on save. */
export async function peekNextInvoiceNumber() {
  const ranges = await apiFetch<Array<{ type: string; preview: string }>>("/settings/accounting/number-ranges");
  return ranges.find((range) => range.type === "invoice")?.preview ?? null;
}

export type InvoiceAttachment = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  createdAt: string;
};

export async function listInvoiceAttachments(invoiceId: string) {
  return apiFetch<InvoiceAttachment[]>(`/invoices/${invoiceId}/attachments`);
}

/**
 * Attaches a file to an invoice.
 *
 * <p>No Content-Type is set: the browser has to write the multipart boundary itself, and setting
 * the header by hand omits it and the request fails to parse server-side.
 */
export async function uploadInvoiceAttachment(invoiceId: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<InvoiceAttachment>(`/invoices/${invoiceId}/attachments`, {
    method: "POST",
    body,
  });
}

export async function deleteInvoiceAttachment(invoiceId: string, documentId: string) {
  return apiFetch<void>(`/invoices/${invoiceId}/attachments/${documentId}`, { method: "DELETE" });
}

export async function markInvoicePaid(id: string) {
  return apiFetch<Invoice>(`/invoices/${id}/mark-paid`, { method: "POST" });
}

export async function cancelInvoice(id: string) {
  return apiFetch<Invoice>(`/invoices/${id}/cancel`, { method: "POST" });
}

export type InvoicePayment = {
  id: string;
  amount: number;
  currency: string;
  method: string;
  paidAt: string;
  reference: string | null;
};

export async function listInvoicePayments(invoiceId: string) {
  return apiFetch<InvoicePayment[]>(`/invoices/${invoiceId}/payments`);
}

export async function recordInvoicePayment(
  invoiceId: string,
  input: { amount: number; method?: string; paidAt?: string; reference?: string | null },
) {
  return apiFetch<InvoicePayment>(`/invoices/${invoiceId}/payments`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** The document formats the server can render for an invoice. */
export type InvoiceFormat = "pdf" | "xrechnung" | "zugferd";

const FORMAT_PATH: Record<InvoiceFormat, string> = {
  pdf: "pdf",
  xrechnung: "xrechnung",
  zugferd: "zugferd",
};

/**
 * Fetches a rendered document as a blob URL.
 *
 * <p>Not a plain `<a href>` or `<iframe src>`: those cannot carry the Authorization header, so the
 * document has to be fetched with the token and handed to the browser as an object URL. The
 * caller owns the URL and must revoke it.
 */
export async function fetchInvoiceDocument(id: string, format: InvoiceFormat = "pdf") {
  const token = getToken();
  const response = await fetch(`${getApiBaseUrl()}/invoices/${id}/${FORMAT_PATH[format]}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!response.ok) {
    throw new ApiError({
      message: `Could not render the ${format.toUpperCase()}`,
      code: "DOCUMENT_FAILED",
    });
  }
  return URL.createObjectURL(await response.blob());
}

/** Replaces an invoice's filing tags. Allowed at any status — tags are not part of the document. */
export async function replaceInvoiceTags(id: string, tags: string[]) {
  return apiFetch<Invoice>(`/invoices/${id}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tags }),
  });
}
