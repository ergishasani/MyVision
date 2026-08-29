import { apiFetch } from "@/lib/api/client";
import type { Invoice, Quote } from "@/types/api";

export async function listQuotes() {
  return apiFetch<Quote[]>("/quotes");
}

export async function getQuote(id: string) {
  return apiFetch<Quote>(`/quotes/${id}`);
}

/**
 * The quote lifecycle. Each step is a POST rather than a status patch, because the server
 * enforces which transitions are legal — only a draft can be sent, only a sent quote accepted or
 * rejected, and only an accepted one converted.
 */
export async function sendQuote(id: string) {
  return apiFetch<Quote>(`/quotes/${id}/send`, { method: "POST" });
}

export async function acceptQuote(id: string) {
  return apiFetch<Quote>(`/quotes/${id}/accept`, { method: "POST" });
}

export async function rejectQuote(id: string) {
  return apiFetch<Quote>(`/quotes/${id}/reject`, { method: "POST" });
}

/** Creates the invoice an accepted quote becomes. Returns the new invoice, not the quote. */
export async function convertQuoteToInvoice(id: string) {
  return apiFetch<Invoice>(`/quotes/${id}/convert-to-invoice`, { method: "POST" });
}
