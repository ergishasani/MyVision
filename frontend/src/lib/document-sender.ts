import type { Company, User } from "@/types/api";

/**
 * The name a document is issued under.
 *
 * Mirrors `InvoiceDocumentService.senderName` so the preview shows what the PDF will print: the
 * legal name where the company has one, or the person behind the business when the invoice is
 * issued without the company name. The supplier's name is never simply omitted — Sec. 14 UStG
 * requires it — so this only ever swaps one name for another.
 *
 * The backend takes the person from the company's owner. Every account has exactly one member
 * until invitations land, so the signed-in user is that owner; revisit this once they do.
 */
export function documentSenderName(
  company: Pick<Company, "name" | "legalName"> | undefined,
  user: Pick<User, "fullName"> | undefined,
  showCompanyName: boolean,
): string {
  if (!showCompanyName) {
    return user?.fullName ?? "";
  }
  return company?.legalName?.trim() || company?.name || "";
}
