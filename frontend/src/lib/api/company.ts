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
