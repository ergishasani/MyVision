import { apiFetch } from "@/lib/api/client";
import type { Quote } from "@/types/api";

export async function listQuotes() {
  return apiFetch<Quote[]>("/quotes");
}

export async function getQuote(id: string) {
  return apiFetch<Quote>(`/quotes/${id}`);
}
