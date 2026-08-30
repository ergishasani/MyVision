import { apiFetch } from "@/lib/api/client";
import type { CompanyProfile } from "@/types/api";

export async function getCompanyProfile() {
  return apiFetch<CompanyProfile>("/company");
}

/** Partial update: omitted fields keep their stored value. */
export async function updateCompanyProfile(patch: Partial<CompanyProfile>) {
  return apiFetch<CompanyProfile>("/company", {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/**
 * Replaces the company logo.
 *
 * <p>Sends FormData so the browser sets the multipart boundary itself; `apiFetch` leaves the
 * Content-Type alone for exactly this case. The backend caps uploads at 2 MB and accepts only
 * PNG, JPEG, WEBP and SVG.
 */
export async function uploadCompanyLogo(file: File) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<{ url: string; path: string }>("/company/logo", {
    method: "POST",
    body,
  });
}
