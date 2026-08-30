/**
 * Wording for the invoice document itself, per language.
 *
 * <p>Separate from the editor's own labels. The editor is the operator's tool and stays in the
 * app's language; this is what the customer reads on the page, and it follows the language chosen
 * on the invoice. The two are genuinely different audiences.
 */

export type DocumentLanguage = "en" | "de";

export type DocumentStrings = {
  defaultNotes: string;
  defaultTerms: string;
  invoiceNo: string;
  date: string;
  deliveryDate: string;
  servicePeriod: string;
  yourContact: string;
  description: string;
  qty: string;
  unitPrice: string;
  lineTotal: string;
  totalNet: string;
  discount: string;
  vat: string;
  totalGross: string;
  noItems: string;
  headingPrefix: string;
  noContact: string;
};

export const DOCUMENT_STRINGS: Record<DocumentLanguage, DocumentStrings> = {
  en: {
    defaultNotes:
      "Dear Sir or Madam,\n\nthank you for your order and for the trust you have placed in us.\nI am pleased to invoice you for the following services:",
    defaultTerms:
      "Please transfer the invoice amount, quoting the invoice number, to the account shown below.\nPayment is due by [%PAYMENT_DUE%].\n\nKind regards\n[%CONTACT_PERSON%]",
    invoiceNo: "Invoice no.",
    date: "Date",
    deliveryDate: "Delivery date",
    servicePeriod: "Service period",
    yourContact: "Your contact",
    description: "Description",
    qty: "Qty",
    unitPrice: "Unit price",
    lineTotal: "Total",
    totalNet: "Total net",
    discount: "Discount",
    vat: "VAT",
    totalGross: "Total gross",
    noItems: "No items yet",
    headingPrefix: "Invoice no.",
    noContact: "No contact selected",
  },
  de: {
    defaultNotes:
      "Sehr geehrte Damen und Herren,\n\nvielen Dank für Ihren Auftrag und das damit verbundene Vertrauen!\nHiermit stelle ich Ihnen die folgenden Leistungen in Rechnung:",
    defaultTerms:
      "Bitte überweisen Sie den Rechnungsbetrag unter Angabe der Rechnungsnummer auf das unten angegebene Konto.\nDer Rechnungsbetrag ist bis zum [%ZAHLUNGSZIEL%] fällig.\n\nMit freundlichen Grüßen\n[%KONTAKTPERSON%]",
    invoiceNo: "Rechnungs-Nr.",
    date: "Datum",
    deliveryDate: "Lieferdatum",
    servicePeriod: "Leistungszeitraum",
    yourContact: "Ihr Ansprechpartner",
    description: "Beschreibung",
    qty: "Menge",
    unitPrice: "Einzelpreis",
    lineTotal: "Gesamtpreis",
    totalNet: "Gesamtbetrag netto",
    discount: "Rabatt",
    vat: "Umsatzsteuer",
    totalGross: "Gesamtbetrag brutto",
    noItems: "Noch keine Positionen",
    headingPrefix: "Rechnung Nr.",
    noContact: "Kein Kontakt ausgewählt",
  },
};

/**
 * Whether a body of text is still one of the shipped defaults.
 *
 * <p>Used to decide if switching language may rewrite it. Anything the operator has actually
 * typed is left alone — silently replacing someone's own wording because they changed a dropdown
 * would be worse than leaving the document bilingual.
 */
export function isUntouchedDefault(value: string, key: "defaultNotes" | "defaultTerms") {
  const normalised = value.trim();
  if (normalised === "") return true;
  return Object.values(DOCUMENT_STRINGS).some((strings) => strings[key].trim() === normalised);
}

/**
 * Fills the placeholders a footer may contain.
 *
 * <p>Both languages' tokens are always substituted, not just the current one: an operator who
 * switches language after editing the footer by hand should not be left with a literal
 * `[%ZAHLUNGSZIEL%]` printed on the page.
 */
export function fillPlaceholders(
  text: string,
  values: { paymentDue: string; contactPerson: string },
) {
  return text
    .replace(/\[%ZAHLUNGSZIEL%\]/g, values.paymentDue)
    .replace(/\[%PAYMENT_DUE%\]/g, values.paymentDue)
    .replace(/\[%KONTAKTPERSON%\]/g, values.contactPerson)
    .replace(/\[%CONTACT_PERSON%\]/g, values.contactPerson);
}
