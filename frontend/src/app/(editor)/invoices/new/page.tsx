"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { getCompanyProfile } from "@/lib/api/company";
import { listClients } from "@/lib/api/dashboard";
import {
  createInvoice,
  markInvoiceSent,
  peekNextInvoiceNumber,
  type InvoiceItemInput,
} from "@/lib/api/invoices";
import { getSession } from "@/lib/auth/session";
import type { Client } from "@/types/api";
import { formatMoney } from "@/lib/utils/format";
import { countryOptions } from "@/lib/countries";
import { documentSenderName } from "@/lib/document-sender";
import {
  DOCUMENT_STRINGS,
  isUntouchedDefault,
  type DocumentLanguage,
} from "@/lib/invoice-document-strings";
import { useT } from "@/components/providers/locale-provider";
import { format } from "@/lib/i18n/format";
import { cn } from "@/lib/utils/cn";
import { InvoicePreview } from "@/components/invoices/invoice-preview";
import { InvoiceAttachments } from "@/components/invoices/invoice-attachments";

const TAX_RATES = [19, 7, 0];
const UNITS = ["pcs", "hour", "day", "sqm", "meter", "kg", "tonne", "litre", "lump_sum"];

/** Where a reference number came from. XRechnung distinguishes these. */
const REFERENCE_KINDS = ["own", "buyer_reference", "order_number"] as const;

/**
 * The VAT treatments, and the note each one obliges the document to carry.
 *
 * <p>Only the first charges VAT. The others are zero-rated for different reasons, and printing
 * the wrong reason is as much a defect as printing the wrong number.
 *
 * <p>Both wordings keep the German statutory reference, because that is what identifies the rule
 * regardless of the language around it. The German wording is the safer one for a recipient in
 * Germany — an English note is legally acceptable but is the unusual choice, and this follows the
 * document's language rather than deciding for the operator.
 */
const TAX_SCHEMES = [
  {
    value: "domestic_taxable",
    group: "domestic",
    noteDe: null,
    noteEn: null,
  },
  {
    value: "domestic_exempt",
    group: "domestic",
    noteDe: "Steuerfreie Leistung nach § 4 UStG.",
    noteEn: "Exempt from VAT under § 4 UStG.",
  },
  {
    value: "reverse_charge_13b",
    group: "domestic",
    noteDe: "Steuerschuldnerschaft des Leistungsempfängers (§ 13b UStG).",
    noteEn: "Reverse charge — the recipient is liable for the VAT (§ 13b UStG).",
  },
  {
    value: "eu_b2b",
    group: "eu",
    noteDe: "Steuerfreie innergemeinschaftliche Lieferung (§ 4 Nr. 1b i.V.m. § 6a UStG).",
    noteEn:
      "Zero-rated intra-community supply (§ 4 Nr. 1b in conjunction with § 6a UStG).",
  },
  {
    value: "export_non_eu",
    group: "nonEu",
    noteDe: "Steuerfreie Ausfuhrlieferung (§ 4 Nr. 1a i.V.m. § 6 UStG).",
    noteEn: "Zero-rated export (§ 4 Nr. 1a in conjunction with § 6 UStG).",
  },
] as const;

/** Stored payment methods. Their wording is shared with company settings. */
const PAYMENT_METHODS = [
  "bank_transfer",
  "cash",
  "card",
  "paypal",
  "stripe",
  "other",
] as const;

export type Line = {
  description: string;
  detail: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  taxRate: string;
  discountAmount: string;
};

const EMPTY_LINE: Line = {
  description: "",
  detail: "",
  quantity: "1",
  unit: "pcs",
  unitPrice: "0",
  taxRate: "19",
  discountAmount: "0",
};

/** Parses a half-typed field without letting NaN reach the totals. */
export function num(value: string) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function lineNet(line: Line) {
  return num(line.quantity) * num(line.unitPrice) - num(line.discountAmount);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(iso: string, days: number) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

export default function NewInvoicePage() {
  const t = useT();
  const c = t.invoiceEditor;
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = getSession();

  const [clients, setClients] = useState<Client[]>([]);
  const [nextNumber, setNextNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"content" | "design">("content");
  // Collapsed by default. The form is what gets typed into; the preview only has to confirm the
  // page looks right, which a thumbnail does without taking half the window.
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const [eInvoice, setEInvoice] = useState(false);
  // Sole traders invoice under their own name; the company name is the default because most
  // accounts have one.
  const [showCompanyName, setShowCompanyName] = useState(true);
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "");
  const [contactQuery, setContactQuery] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  const [issueDate, setIssueDate] = useState(today);
  const [deliveryDate, setDeliveryDate] = useState(today);
  const [usePeriod, setUsePeriod] = useState(false);
  const [periodStart, setPeriodStart] = useState(today);
  const [periodEnd, setPeriodEnd] = useState(today);
  const [dueDate, setDueDate] = useState(() => addDays(today(), 14));
  const [reference, setReference] = useState("");
  const [referenceKind, setReferenceKind] = useState("own");
  const [costCentre, setCostCentre] = useState("");
  // Which VAT-treatment panel is open. Matches the reference: home country expanded, the two
  // cross-border ones folded away until needed.
  const [openScheme, setOpenScheme] = useState<string | null>("domestic");
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [notes, setNotes] = useState(DOCUMENT_STRINGS.en.defaultNotes);
  const [terms, setTerms] = useState(DOCUMENT_STRINGS.en.defaultTerms);

  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);
  const [documentDiscount, setDocumentDiscount] = useState("0");
  const [grossEntry, setGrossEntry] = useState(false);
  const [showLineDiscounts, setShowLineDiscounts] = useState(false);
  const [showOverallDiscount, setShowOverallDiscount] = useState(false);

  const [currency, setCurrency] = useState("EUR");
  const [language, setLanguage] = useState<DocumentLanguage>("en");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [taxScheme, setTaxScheme] = useState<string>("domestic_taxable");
  const [skontoDays, setSkontoDays] = useState("0");
  const [skontoPercent, setSkontoPercent] = useState("0");

  // Address overrides. Untouched, the contact's own address is used — and the server falls back
  // the same way, so the rule lives in one place.
  const [addressTouched, setAddressTouched] = useState(false);
  const [address, setAddress] = useState({
    line1: "",
    postalCode: "",
    city: "",
    countryCode: "DE",
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listClients(),
      peekNextInvoiceNumber().catch(() => null),
      // A failed profile load must not block the editor: the language simply stays at its
      // default, which is the same outcome as before this was wired up.
      getCompanyProfile().catch(() => null),
    ])
      .then(([clientList, preview, company]) => {
        if (cancelled) return;
        setClients(clientList);
        setNextNumber(preview);

        // New documents start in the company's configured language rather than always English.
        // Routed through changeLanguage so the shipped covering letter and payment terms switch
        // with it. An invoice that already exists keeps whatever language it was issued in —
        // that is a property of the document, not a display preference.
        const preferred = company?.defaultLanguage;
        const documentLanguage: DocumentLanguage =
          preferred === "de" || preferred === "en" ? preferred : "en";
        if (documentLanguage !== "en") changeLanguage(documentLanguage);

        // Prefilled rather than a placeholder, because the reference ships it as real content the
        // operator can edit — a placeholder would save as an empty subject.
        if (preview) {
          const heading = DOCUMENT_STRINGS[documentLanguage].invoiceNo;
          setSubject((current) => (current ? current : `${heading} ${preview}`));
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : c.loadContactsError);
      });
    return () => {
      cancelled = true;
    };
    // The dictionary is only read for the failure message; re-running on a language switch
    // would refetch contacts and reseed the editor for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const client = clients.find((c) => c.id === clientId) ?? null;
  const scheme = TAX_SCHEMES.find((s) => s.value === taxScheme) ?? TAX_SCHEMES[0];

  // A contact can arrive from ?clientId=, in which case the search box has to catch up once the
  // list loads. Derived rather than synced through an effect, which would fight the typing.
  const contactValue = contactQuery || client?.name || "";

  const effectiveAddress = addressTouched
    ? address
    : {
        line1: client?.addressLine1 ?? "",
        postalCode: client?.postalCode ?? "",
        city: client?.city ?? "",
        // No contact yet means no country to show. Defaulting to DE before one is chosen would
        // put a country on the document that nobody selected.
        countryCode: client?.countryCode ?? "",
      };
  const effectiveAddressCountry = effectiveAddress.countryCode;

  // Built around the value in play, so a contact in a country outside any shortlist still shows
  // its own country rather than silently falling back to the first option.
  const countries = useMemo(
    () => countryOptions(language, effectiveAddressCountry),
    [language, effectiveAddressCountry],
  );


  const effectiveEmail = recipientEmail || client?.email || "";
  const paymentTermDays = daysBetween(issueDate, dueDate);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + lineNet(line), 0);
    const discount = Math.min(num(documentDiscount), subtotal);
    // Zero-rated schemes charge no VAT at all — the server enforces the same, so the preview
    // cannot promise a figure the saved invoice will not have.
    const taxable = taxScheme === "domestic_taxable";
    const tax = !taxable || subtotal === 0
      ? 0
      : lines.reduce((sum, line) => {
          const net = lineNet(line);
          const share = discount * (net / subtotal);
          return sum + ((net - share) * num(line.taxRate)) / 100;
        }, 0);
    return { subtotal, discount, tax, total: subtotal - discount + tax };
  }, [lines, documentDiscount, taxScheme]);

  // The rates actually in play, so the totals line can name them the way the form does.
  const vatRateLabel = (() => {
    if (taxScheme !== "domestic_taxable") return "";
    const rates = [...new Set(lines.map((line) => num(line.taxRate)))].sort((a, b) => b - a);
    return rates.length === 1 ? `${rates[0]} %` : "";
  })();

  const filledLines = lines.filter((line) => line.description.trim() !== "");
  const missing: string[] = [];
  if (eInvoice && !clientId) missing.push("a contact");
  if (eInvoice && !effectiveEmail) missing.push("a recipient email");
  if (!clientId) missing.push("a contact");
  if (!subject.trim() && !nextNumber) missing.push("a subject");
  if (filledLines.length === 0) missing.push("at least one line");
  const canSave = clientId !== "" && filledLines.length > 0 && (!eInvoice || !!effectiveEmail);

  /**
   * Switches the document's language.
   *
   * <p>The shipped header and footer text follow the choice, but only while they are still the
   * shipped text. Once someone has written their own wording, changing a dropdown must not throw
   * it away — a half-finished invoice losing its covering letter is far worse than a document
   * whose boilerplate is in the previous language.
   */
  function changeLanguage(next: DocumentLanguage) {
    setLanguage(next);
    setNotes((current) =>
      isUntouchedDefault(current, "defaultNotes") ? DOCUMENT_STRINGS[next].defaultNotes : current,
    );
    setTerms((current) =>
      isUntouchedDefault(current, "defaultTerms") ? DOCUMENT_STRINGS[next].defaultTerms : current,
    );
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  /** Keeps the two ways of expressing a payment term in step. */
  function setTermDays(days: number) {
    setDueDate(addDays(issueDate, Number.isFinite(days) ? days : 0));
  }

  async function save(thenSend: boolean) {
    setSaving(true);
    setError(null);
    try {
      const items: InvoiceItemInput[] = filledLines.map((line) => ({
        description: line.detail.trim()
          ? `${line.description.trim()}\n${line.detail.trim()}`
          : line.description.trim(),
        quantity: num(line.quantity) || 1,
        unit: line.unit,
        unitPrice: num(line.unitPrice),
        taxRate: num(line.taxRate),
        discountAmount: num(line.discountAmount),
      }));

      const created = await createInvoice({
        clientId,
        issueDate,
        dueDate,
        deliveryDate: usePeriod ? periodEnd : deliveryDate,
        servicePeriodStart: usePeriod ? periodStart : null,
        servicePeriodEnd: usePeriod ? periodEnd : null,
        subject: subject.trim() || null,
        reference: reference.trim() || null,
        taxScheme,
        paymentMethod,
        language,
        skontoDays: num(skontoDays) || null,
        skontoPercent: num(skontoPercent) || null,
        eInvoice,
        showCompanyName,
        recipientEmail: recipientEmail.trim() || null,
        // Sent only when edited, so the server's fallback stays the single source of the rule.
        recipientAddressLine1: addressTouched ? address.line1 || null : null,
        recipientPostalCode: addressTouched ? address.postalCode || null : null,
        recipientCity: addressTouched ? address.city || null : null,
        recipientCountryCode: addressTouched ? address.countryCode || null : null,
        currency,
        discountAmount: num(documentDiscount),
        notes: notes.trim() || null,
        terms: terms.trim() || null,
        items,
      });

      if (thenSend) {
        await markInvoiceSent(created.id);
        router.push(`/invoices/${created.id}`);
        return;
      }
      // A draft stays on the editor so documents can be attached to the invoice that now exists —
      // there is nothing to attach them to before the first save.
      setSavedInvoiceId(created.id);
      setSaving(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : c.saveError);
      setSaving(false);
    }
  }

  // Gathered once: the thumbnail and the expanded pane render the same document, and two copies
  // of this list would drift the moment a field was added.
  const previewProps = {
    companyName: documentSenderName(session?.company, session?.user, showCompanyName),
    number: nextNumber,
    subject,
    issueDate,
    deliveryDate: usePeriod ? null : deliveryDate,
    periodStart: usePeriod ? periodStart : null,
    periodEnd: usePeriod ? periodEnd : null,
    dueDate,
    recipientName: client?.name ?? null,
    addressLine1: effectiveAddress.line1,
    postalCode: effectiveAddress.postalCode,
    city: effectiveAddress.city,
    countryCode: effectiveAddress.countryCode,
    notes,
    terms,
    lines,
    currency,
    totals,
    taxNote: language === "de" ? scheme.noteDe : scheme.noteEn,
    language,
    contactPerson: session?.user.fullName ?? null,
  };

  return (
    // No negative margins any more: the editor route group gives this page the whole
    // viewport, rather than it having to claw back the dashboard shell's padding.
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/invoices"
            aria-label={c.backAria}
            className="grid size-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
          </Link>
          <h1 className="text-lg font-semibold text-foreground">
            {eInvoice ? c.createEInvoice : c.createInvoice}
          </h1>

          <label className="ml-2 flex items-center gap-2 border-l border-border pl-4">
            <button
              type="button"
              role="switch"
              aria-checked={eInvoice}
              onClick={() => setEInvoice((on) => !on)}
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                eInvoice ? "bg-primary" : "bg-slate-300",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white transition-transform",
                  eInvoice ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
            <span className="text-sm text-foreground">{c.eInvoice}</span>
          </label>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/invoices"
            className="hidden h-9 items-center gap-1.5 rounded-lg bg-slate-100 px-3 text-sm text-muted transition-colors hover:bg-slate-200 sm:inline-flex"
          >
            <ClockIcon className="size-4" />
            {c.oldVersion}
          </Link>
          <Link
            href="/settings/accounting"
            aria-label={c.documentSettings}
            className="grid size-9 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 hover:text-foreground"
          >
            <GearIcon className="size-4" />
          </Link>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => save(false)}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? c.saving : c.saveDraft}
          </button>
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => save(true)}
            title={canSave ? undefined : `Still needs ${missing[0] ?? "more detail"}`}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Finalise
            <ChevronDownIcon className="size-4 opacity-70" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Form pane */}
        <div className="relative min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {/* Floats over the form rather than sitting beside it, so folding it away gives the
              form the whole width instead of leaving a gap where the pane used to be. */}
          {!previewExpanded ? (
            <div className="absolute right-6 top-6 z-20 hidden xl:block">
              <InvoicePreview
                variant="thumbnail"
                onExpand={() => setPreviewExpanded(true)}
                {...previewProps}
              />
            </div>
          ) : null}

          <div className="mx-auto max-w-3xl">
            <div className="inline-flex rounded-lg bg-slate-100 p-1">
              {(["content", "design"] as const).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setTab(name)}
                  className={cn(
                    "rounded-md px-6 py-1.5 text-sm capitalize transition-colors",
                    tab === name ? "bg-white font-medium text-foreground shadow-sm" : "text-muted",
                  )}
                >
                  {name}
                </button>
              ))}
            </div>

            {error ? (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">{c.saveErrorHeading}</p>
                <p className="mt-1 text-sm text-red-600">{error}</p>
              </div>
            ) : null}

            {tab === "design" ? (
              <DesignTab />
            ) : (
              <div className="space-y-10 pb-16 pt-8">
                {/* --- recipient ------------------------------------------- */}
                <Section title={c.recipient}>
                  <div className="flex items-baseline justify-between">
                    <Label required={eInvoice}>{c.contact}</Label>
                    <Link href="/clients" className="text-sm text-primary hover:underline">
                      Create new contact
                    </Link>
                  </div>
                  {/* A search field rather than a dropdown: a builder with a few hundred
                      contacts cannot find one in a select, and the reference uses the same. */}
                  <input
                    list="invoice-contacts"
                    value={contactValue}
                    onChange={(event) => {
                      const value = event.target.value;
                      setContactQuery(value);
                      const match = clients.find((c) => c.name === value);
                      setClientId(match ? match.id : "");
                    }}
                    placeholder={c.contactPlaceholder}
                    className={inputClass}
                  />
                  <datalist id="invoice-contacts">
                    {clients.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                  {contactValue && !clientId ? (
                    <p className="mt-1 text-xs text-amber-700">
                      Pick a contact from the list — this name does not match one yet.
                    </p>
                  ) : null}

                  <div className="mt-5 flex items-baseline justify-between">
                    <Label>{c.address}</Label>
                    {!addressTouched ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAddressTouched(true);
                          setAddress(effectiveAddress);
                        }}
                        className="text-sm text-primary hover:underline"
                      >
                        Override +
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddressTouched(false)}
                        className="text-sm text-primary hover:underline"
                      >
                        Use the contact&apos;s address
                      </button>
                    )}
                  </div>
                  <input
                    value={effectiveAddress.line1}
                    readOnly={!addressTouched}
                    onChange={(event) =>
                      setAddress({ ...effectiveAddress, line1: event.target.value })
                    }
                    placeholder={c.phStreet}
                    className={cn(inputClass, !addressTouched && inheritedClass)}
                  />
                  <div className="mt-2 flex gap-2">
                    <input
                      value={effectiveAddress.postalCode}
                      readOnly={!addressTouched}
                      onChange={(event) =>
                        setAddress({ ...effectiveAddress, postalCode: event.target.value })
                      }
                      placeholder={c.phPostcode}
                      className={cn(inputClass, "w-36", !addressTouched && inheritedClass)}
                    />
                    <input
                      value={effectiveAddress.city}
                      readOnly={!addressTouched}
                      onChange={(event) =>
                        setAddress({ ...effectiveAddress, city: event.target.value })
                      }
                      placeholder={c.phCity}
                      className={cn(inputClass, "flex-1", !addressTouched && inheritedClass)}
                    />
                  </div>
                  <select
                    value={effectiveAddress.countryCode}
                    disabled={!addressTouched}
                    onChange={(event) =>
                      setAddress({ ...effectiveAddress, countryCode: event.target.value })
                    }
                    className={cn(inputClass, "mt-2", !addressTouched && inheritedClass)}
                  >
                    <option value="">{c.noCountry}</option>
                    {countries.map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>

                  {/* Charging domestic VAT to a recipient outside Germany is usually wrong, and
                      the default scheme is the domestic one. Prompted rather than changed
                      automatically: which treatment applies depends on facts this system does not
                      hold, such as whether the customer is VAT-registered. */}
                  {effectiveAddressCountry &&
                  effectiveAddressCountry !== "DE" &&
                  taxScheme === "domestic_taxable" ? (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      This recipient is outside Germany but the invoice is set to charge domestic
                      VAT. Check the VAT treatment below before finalising.
                    </p>
                  ) : null}

                  {/* Only an e-invoice needs this: XRechnung has nowhere to put a document
                      without an address to deliver it to. */}
                  {eInvoice ? (
                    <div className="mt-5">
                      <Label required>{c.emailAddress}</Label>
                      <input
                        type="email"
                        value={recipientEmail || client?.email || ""}
                        onChange={(event) => setRecipientEmail(event.target.value)}
                        placeholder={c.phEmail}
                        className={inputClass}
                      />
                      {!effectiveEmail ? (
                        <p className="mt-1 text-xs text-amber-700">
                          Required before an e-invoice can be saved.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </Section>

                {/* --- invoice information --------------------------------- */}
                <Section title={c.invoiceInformation}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={c.invoiceDate} required>
                      <input
                        type="date"
                        value={issueDate}
                        onChange={(event) => setIssueDate(event.target.value)}
                        className={inputClass}
                      />
                    </Field>

                    <div>
                      <div className="flex items-baseline justify-between">
                        <Label required>{usePeriod ? c.servicePeriod : c.deliveryDate}</Label>
                        <button
                          type="button"
                          onClick={() => setUsePeriod((on) => !on)}
                          className="text-sm text-primary hover:underline"
                        >
                          {usePeriod ? c.singleDate : c.period}
                        </button>
                      </div>
                      {usePeriod ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            value={periodStart}
                            onChange={(event) => setPeriodStart(event.target.value)}
                            className={inputClass}
                          />
                          <span className="text-sm text-muted">–</span>
                          <input
                            type="date"
                            value={periodEnd}
                            onChange={(event) => setPeriodEnd(event.target.value)}
                            className={inputClass}
                          />
                        </div>
                      ) : (
                        <input
                          type="date"
                          value={deliveryDate}
                          onChange={(event) => setDeliveryDate(event.target.value)}
                          className={inputClass}
                        />
                      )}
                      {/* Not decoration: Sec. 14 UStG requires one of these on the document. */}
                      <p className="mt-1 text-xs text-muted">
                        Required on a German invoice (Sec. 14 UStG).
                      </p>
                    </div>

                    <Field label={c.invoiceNumber} required>
                      <div className="relative">
                        <input
                          value={nextNumber ?? "assigned on save"}
                          readOnly
                          className={cn(inputClass, readOnlyClass, "pr-10")}
                        />
                        <Link
                          href="/settings/accounting"
                          aria-label={c.numberingSettings}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted hover:bg-slate-100"
                        >
                          <GearIcon className="size-4" />
                        </Link>
                      </div>
                    </Field>

                    <div>
                      <Label>{c.referenceNumber}</Label>
                      {/* XRechnung distinguishes what a reference is — a buyer's Leitweg-ID is
                          not the same field as your own order number — so the kind is only asked
                          for when it actually changes the export. */}
                      {eInvoice ? (
                        <div className="flex gap-2">
                          <select
                            value={referenceKind}
                            onChange={(event) => setReferenceKind(event.target.value)}
                            className={cn(inputClass, "w-44")}
                          >
                            {REFERENCE_KINDS.map((kind) => (
                              <option key={kind} value={kind}>
                                {c.referenceKinds[kind]}
                              </option>
                            ))}
                          </select>
                          <input
                            value={reference}
                            onChange={(event) => setReference(event.target.value)}
                            className={cn(inputClass, "flex-1")}
                          />
                        </div>
                      ) : (
                        <input
                          value={reference}
                          onChange={(event) => setReference(event.target.value)}
                          className={inputClass}
                        />
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <Label required={eInvoice}>{c.paymentDue}</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="date"
                          value={dueDate}
                          onChange={(event) => setDueDate(event.target.value)}
                          className={cn(inputClass, "max-w-xs")}
                        />
                        <span className="text-sm text-muted">{c.inWord}</span>
                        <input
                          value={paymentTermDays}
                          onChange={(event) => setTermDays(Number(event.target.value))}
                          inputMode="numeric"
                          className="h-10 w-16 rounded-lg border border-border bg-card px-2 text-center text-sm outline-none focus:border-primary"
                        />
                        <span className="text-sm text-muted">{c.daysWord}</span>
                      </div>
                    </div>
                  </div>
                </Section>

                {/* --- header text ----------------------------------------- */}
                <Section title={c.headerText}>
                  <Field label={c.subject} required>
                    <input
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder={c.subjectPlaceholder}
                      className={inputClass}
                    />
                  </Field>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={5}
                    className={cn(inputClass, "mt-4 h-auto py-3 leading-relaxed")}
                  />
                </Section>

                {/* --- items ------------------------------------------------ */}
                <Section
                  title={c.items}
                  aside={
                    <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs">
                      {[
                        { value: true, label: c.gross },
                        { value: false, label: c.net },
                      ].map((mode) => (
                        <button
                          key={mode.label}
                          type="button"
                          onClick={() => setGrossEntry(mode.value)}
                          className={cn(
                            "rounded-md px-3 py-1 transition-colors",
                            grossEntry === mode.value
                              ? "bg-white font-medium text-foreground shadow-sm"
                              : "text-muted",
                          )}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  }
                >
                  {grossEntry ? (
                    <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Prices are still entered and stored net. Gross entry is not wired up yet, so
                      this toggle only labels the column — it does not convert anything.
                    </p>
                  ) : null}

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-[0.7rem] uppercase tracking-wide text-muted">
                          <th className="w-8 pb-2">#</th>
                          <th className="pb-2">{c.colProductOrService}</th>
                          <th className="w-32 pb-2">
                            {c.colPrice}{" "}
                            <span className="font-normal opacity-70">{c.colPriceNetSuffix}</span>
                          </th>
                          <th className="w-36 pb-2">{c.colQty}</th>
                          <th className="w-20 pb-2">{c.colVat}</th>
                          <th className="w-28 pb-2 text-right">{c.colAmount}</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line, index) => (
                          <tr key={index} className="border-b border-border last:border-0">
                            <td className="py-2 pr-2 align-top text-muted">{index + 1}.</td>
                            <td className="py-2 pr-2">
                              <input
                                value={line.description}
                                onChange={(event) =>
                                  updateLine(index, { description: event.target.value })
                                }
                                placeholder={c.phProductOrService}
                                className={smallInput}
                              />
                              <input
                                value={line.detail}
                                onChange={(event) =>
                                  updateLine(index, { detail: event.target.value })
                                }
                                placeholder={c.phAddDescription}
                                className={cn(smallInput, "mt-1.5 text-xs")}
                              />
                            </td>
                            <td className="py-2 pr-2 align-top">
                              {/* The currency sits inside the field, as on the reference, so the
                                  column reads as money rather than as a bare number. */}
                              <div className="relative">
                                <input
                                  value={line.unitPrice}
                                  onChange={(event) =>
                                    updateLine(index, { unitPrice: event.target.value })
                                  }
                                  inputMode="decimal"
                                  className={cn(smallInput, "pr-7 text-right")}
                                />
                                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">
                                  {currencySymbol(currency)}
                                </span>
                              </div>
                            </td>
                            {/* Quantity and unit share one bordered group, as they do on the
                                reference — they are one quantity, not two fields. */}
                            <td className="py-2 pr-2 align-top">
                              <div className="flex h-9 items-stretch overflow-hidden rounded-lg border border-border focus-within:border-primary">
                                <input
                                  value={line.quantity}
                                  onChange={(event) =>
                                    updateLine(index, { quantity: event.target.value })
                                  }
                                  inputMode="decimal"
                                  className="w-full min-w-0 bg-card px-2 text-right text-sm outline-none"
                                />
                                <select
                                  value={line.unit}
                                  onChange={(event) =>
                                    updateLine(index, { unit: event.target.value })
                                  }
                                  className="shrink-0 border-l border-border bg-card px-1 text-sm outline-none"
                                >
                                  {UNITS.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="py-2 pr-2 align-top">
                              <select
                                value={line.taxRate}
                                disabled={taxScheme !== "domestic_taxable"}
                                onChange={(event) =>
                                  updateLine(index, { taxRate: event.target.value })
                                }
                                title={
                                  taxScheme !== "domestic_taxable"
                                    ? c.noTaxHint
                                    : undefined
                                }
                                className={cn(smallInput, "disabled:opacity-50")}
                              >
                                {TAX_RATES.map((rate) => (
                                  <option key={rate} value={rate}>
                                    {rate}%
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2 pr-2 text-right align-top tabular-nums text-foreground">
                              {formatMoney(lineNet(line), currency)}
                            </td>
                            <td className="py-2 text-right align-top">
                              <button
                                type="button"
                                aria-label={`Remove line ${index + 1}`}
                                disabled={lines.length === 1}
                                onClick={() => setLines((c) => c.filter((_, i) => i !== index))}
                                className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                              >
                                <TrashIcon className="size-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => setLines((c) => [...c, { ...EMPTY_LINE }])}
                      className="rounded-md bg-primary/10 px-2.5 py-1 font-medium text-primary transition-colors hover:bg-primary/15"
                    >
                      + Line
                    </button>
                    <Link
                      href="/products"
                      className="px-2.5 py-1 font-medium text-primary hover:underline"
                    >
                      + Choose product
                    </Link>
                    <button
                      type="button"
                      onClick={() => setShowLineDiscounts((on) => !on)}
                      className="px-2.5 py-1 font-medium text-primary hover:underline"
                    >
                      {showLineDiscounts ? "− Line discount" : "+ Line discount"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowOverallDiscount((on) => !on)}
                      className="px-2.5 py-1 font-medium text-primary hover:underline"
                    >
                      {showOverallDiscount ? "− Overall discount" : "+ Overall discount"}
                    </button>
                  </div>

                  <div className="mt-6 space-y-2 pt-4 text-sm">
                    {showOverallDiscount ? (
                      <div className="flex items-center justify-between">
                        <label htmlFor="doc-discount" className="text-muted">
                          Overall discount
                        </label>
                        <input
                          id="doc-discount"
                          value={documentDiscount}
                          onChange={(event) => setDocumentDiscount(event.target.value)}
                          inputMode="decimal"
                          className="h-9 w-28 rounded-lg border border-border bg-card px-2 text-right text-sm outline-none focus:border-primary"
                        />
                      </div>
                    ) : null}
                    <div className="flex justify-between text-muted">
                      <span>{c.totalNet}</span>
                      <span className="tabular-nums">
                        {formatMoney(totals.subtotal - totals.discount, currency)}
                      </span>
                    </div>
                    {/* The rate is part of the label, as on the form: "VAT" alone does not say
                        which rate produced the figure when lines mix 19 and 7. */}
                    <div className="flex justify-between text-muted">
                      <span>{format(c.vatWithRate, { rate: vatRateLabel })}</span>
                      <span className="tabular-nums">{formatMoney(totals.tax, currency)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-4 text-lg font-semibold text-foreground">
                      <span>{c.total}</span>
                      <span className="tabular-nums">{formatMoney(totals.total, currency)}</span>
                    </div>
                  </div>
                </Section>

                {/* --- footer text ------------------------------------------ */}
                <Section title={c.footerText}>
                  <textarea
                    value={terms}
                    onChange={(event) => setTerms(event.target.value)}
                    rows={5}
                    className={cn(inputClass, "h-auto py-3 leading-relaxed")}
                  />
                  <p className="mt-2 text-xs text-muted">
                    [%ZAHLUNGSZIEL%] is replaced with the payment due date when the document is
                    rendered.
                  </p>
                </Section>

                {/* --- further options -------------------------------------- */}
                <Section title={c.furtherOptions}>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={c.currency}>
                      <select
                        value={currency}
                        onChange={(event) => setCurrency(event.target.value)}
                        className={inputClass}
                      >
                        {["EUR", "CHF", "USD", "GBP"].map((code) => (
                          <option key={code} value={code}>
                            {code}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label={c.internalContact}>
                      <select
                        value={session?.user.id ?? ""}
                        onChange={() => {
                          /* Only the signed-in user exists as an option today; team members
                             become selectable once invitations land. */
                        }}
                        className={inputClass}
                      >
                        <option value={session?.user.id ?? ""}>
                          {session?.user.fullName ?? "—"}
                        </option>
                      </select>
                    </Field>

                    <Field label={c.language}>
                      <select
                        value={language}
                        onChange={(event) =>
                          changeLanguage(event.target.value as DocumentLanguage)
                        }
                        className={inputClass}
                      >
                        <option value="en">{c.languageEnglish}</option>
                        <option value="de">{c.languageGerman}</option>
                      </select>
                    </Field>

                    <Field label={c.costCentre}>
                      <input
                        value={costCentre}
                        onChange={(event) => setCostCentre(event.target.value)}
                        placeholder={c.costCentrePlaceholder}
                        className={inputClass}
                      />
                    </Field>

                    <Field label={c.paymentMethod} required>
                      <select
                        value={paymentMethod}
                        onChange={(event) => setPaymentMethod(event.target.value)}
                        className={inputClass}
                      >
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {t.settings.company.paymentMethods[method]}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <div className="sm:col-span-2">
                      <Label>{c.issuedBy}</Label>
                      {/* The name itself is not optional — Sec. 14 UStG requires the supplier's
                          full name — so this picks which name the document carries. */}
                      <label className="flex items-center gap-3 py-1.5">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={showCompanyName}
                          onClick={() => setShowCompanyName((on) => !on)}
                          className={cn(
                            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                            showCompanyName ? "bg-primary" : "bg-slate-300",
                          )}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 size-5 rounded-full bg-white transition-transform",
                              showCompanyName ? "translate-x-5" : "translate-x-0.5",
                            )}
                          />
                        </button>
                        <span className="text-sm text-foreground">
                          {c.showCompanyName}
                          <span className="ml-2 text-xs text-muted">
                            {showCompanyName
                              ? c.invoicingAsBusiness
                              : format(c.invoicingAsPerson, {
                                  name: session?.user.fullName ?? c.yourself,
                                })}
                          </span>
                        </span>
                      </label>
                    </div>

                    <div className="sm:col-span-2">
                      <Label>{c.skonto}</Label>
                      {/* Units sit inside the fields, as on the reference. */}
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <input
                            value={skontoDays}
                            onChange={(event) => setSkontoDays(event.target.value)}
                            inputMode="numeric"
                            className={cn(inputClass, "pr-12")}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                            days
                          </span>
                        </div>
                        <div className="relative flex-1">
                          <input
                            value={skontoPercent}
                            onChange={(event) => setSkontoPercent(event.target.value)}
                            inputMode="decimal"
                            className={cn(inputClass, "pr-8")}
                          />
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                            %
                          </span>
                        </div>
                      </div>
                      {client?.discountDays ? (
                        <p className="mt-1 text-xs text-muted">
                          This contact&apos;s agreed terms: {client.discountPercent}% within{" "}
                          {client.discountDays} days.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </Section>

                {/* --- VAT treatment ---------------------------------------- */}
                <Section title={c.vatTreatment}>
                  <div className="space-y-3">
                    {(["domestic", "eu", "nonEu"] as const).map((groupName) => {
                      const open = openScheme === groupName;
                      return (
                        <div key={groupName} className="overflow-hidden rounded-lg bg-slate-50">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenScheme(open ? null : groupName)}
                            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-foreground"
                          >
                            {c.schemeGroups[groupName]}
                            <ChevronDownIcon
                              className={cn(
                                "size-4 text-muted transition-transform",
                                open && "rotate-180",
                              )}
                            />
                          </button>

                          {open ? (
                            <div className="space-y-3 bg-card px-4 py-4">
                              {TAX_SCHEMES.filter((s) => s.group === groupName).map((option) => (
                                <label
                                  key={option.value}
                                  className="flex items-start gap-2.5 text-sm"
                                >
                                  <input
                                    type="radio"
                                    name="tax-scheme"
                                    checked={taxScheme === option.value}
                                    onChange={() => setTaxScheme(option.value)}
                                    className="mt-0.5"
                                  />
                                  <span className="flex items-start gap-1.5">
                                    <span className="text-foreground">{c.schemeLabels[option.value]}</span>
                                    {option.noteDe ? (
                                      <InfoDot
                                        text={language === "de" ? option.noteDe : option.noteEn}
                                      />
                                    ) : null}
                                  </span>
                                </label>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {taxScheme !== "domestic_taxable" ? (
                    <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      No VAT is charged under this treatment. The per-line rates are ignored and the
                      note above is printed on the document.
                    </p>
                  ) : null}
                </Section>
                {/* --- attachments ------------------------------------------ */}
                <Section title={c.addDocuments}>
                  <p className="-mt-2 mb-4 text-sm text-muted">
                    {c.addDocumentsHint}
                  </p>
                  <InvoiceAttachments invoiceId={savedInvoiceId} />
                </Section>
              </div>
            )}
          </div>
        </div>

        {/* Preview pane, once expanded */}
        {previewExpanded ? (
          <aside className="hidden w-[46%] max-w-2xl shrink-0 overflow-y-auto border-l border-border bg-slate-100 px-6 py-6 lg:block">
            <InvoicePreview onCollapse={() => setPreviewExpanded(false)} {...previewProps} />
          </aside>
        ) : null}
      </div>
    </div>
  );
}

/* --- the design tab ------------------------------------------------------- */

function DesignTab() {
  const c = useT().invoiceEditor;
  return (
    <div className="mt-8 rounded-xl border border-border bg-card p-8 text-center">
      <p className="text-sm font-medium text-foreground">{c.designTitle}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">
        {c.designBody}
      </p>
      <Link
        href="/settings/stationery"
        className="mt-4 inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-slate-50"
      >
        Open stationery settings
      </Link>
    </div>
  );
}

/* --- small building blocks ------------------------------------------------ */

const inputClass =
  "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary";
/**
 * Styling for a field showing an inherited value.
 *
 * <p>Tinted so it reads as "came from the contact", but the text stays full strength: muting it
 * made a populated address look like placeholder text, so a real address read as an empty form.
 */
const inheritedClass = "cursor-default bg-slate-50 text-foreground";

/** For a field with nothing in it and nothing to inherit. */
const readOnlyClass = "cursor-not-allowed bg-slate-50 text-muted";
const smallInput =
  "h-9 w-full rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary";

function Section({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="mb-1 block text-sm text-foreground">
      {children}
      {required ? <span className="ml-0.5 text-red-600">*</span> : null}
    </span>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <Label required={required}>{label}</Label>
      {children}
    </label>
  );
}

/* --- icons --- */
type IconProps = { className?: string };
const ChevronLeftIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m14 6-6 6 6 6" />
  </svg>
);
const GearIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </svg>
);
const ChevronDownIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const ClockIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

/** The small circled "i" beside a VAT option, carrying the note that option prints. */
function InfoDot({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="mt-0.5 grid size-4 shrink-0 cursor-help place-items-center rounded-full border border-muted/50 text-[10px] font-semibold text-muted"
    >
      i
    </span>
  );
}

/** Just the symbol, for inside a field where the amount is typed separately. */
function currencySymbol(code: string) {
  try {
    return (0)
      .toLocaleString("de-DE", { style: "currency", currency: code })
      .replace(/[\d.,\s]/g, "");
  } catch {
    return code;
  }
}

const TrashIcon = ({ className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 13h10l1-13" />
    <path d="M9 7V4h6v3" />
  </svg>
);
