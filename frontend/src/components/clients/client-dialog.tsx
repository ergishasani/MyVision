"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import {
  createClient,
  peekNextCustomerNumber,
  updateClient,
  type ClientInput,
  type ContactDetailInput,
} from "@/lib/api/clients";
import type { Client, DiscountUnit } from "@/types/api";
import { useT } from "@/components/providers/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { format } from "@/lib/i18n/format";
import { cn } from "@/lib/utils/cn";

/** Section keys, deliberately not the visible labels — those change with the language. */
const SECTIONS = [
  "address",
  "contactDetails",
  "paymentInformation",
  "termsAndConditions",
  "notes",
] as const;
type Section = (typeof SECTIONS)[number];

/**
 * Salutations.
 *
 * <p>The label is what this screen shows; the value is what gets printed in the address block of
 * a German document, which is why it stays German. Translating the stored value would put "Ms"
 * on a letter to a German customer.
 */
const SALUTATIONS = ["", "Frau", "Herr", "Divers"];

/** Maps each stored salutation to its label in the active language. */
const salutationLabels = (d: Dictionary["clientDialog"]): Record<string, string> => ({
  "": d.salutations.none,
  Frau: d.salutations.frau,
  Herr: d.salutations.herr,
  Divers: d.salutations.divers,
});

/** Stored role values. Their labels come from the dictionary. */
const ROLES = ["customer", "supplier", "partner", "prospect"] as const;

/** Stored contact-detail labels. Their wording comes from the dictionary. */
const DETAIL_LABELS = [
  "work",
  "mobile",
  "fax",
  "personal",
  "billing",
  "newsletter",
  "other",
] as const;

const EMPTY: ClientInput = {
  type: "business",
  name: "",
  contactName: "",
  salutation: "",
  academicTitle: "",
  firstName: "",
  lastName: "",
  nameSuffix: "",
  position: "",
  contactRole: "customer",
  iban: "",
  bic: "",
  taxNumber: "",
  showVatId: false,
  einvoiceStandard: false,
  paymentTermsDays: null,
  discountDays: null,
  discountPercent: null,
  customerDiscount: null,
  customerDiscountUnit: "percent",
  terms: "",
  debtorNumber: "",
  creditorNumber: "",
  email: "",
  phone: "",
  vatNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  region: "",
  postalCode: "",
  countryCode: "DE",
  notes: "",
};

/** The stored contact, as the form's own shape. Mirrors {@link EMPTY} field for field. */
function seedFrom(client: Client): ClientInput {
  return {
    type: client.type,
    name: client.name,
    contactName: client.contactName ?? "",
    salutation: client.salutation ?? "",
    academicTitle: client.academicTitle ?? "",
    firstName: client.firstName ?? "",
    lastName: client.lastName ?? "",
    nameSuffix: client.nameSuffix ?? "",
    position: client.position ?? "",
    contactRole: client.contactRole,
    customerNumber: client.customerNumber,
    iban: client.iban ?? "",
    bic: client.bic ?? "",
    taxNumber: client.taxNumber ?? "",
    showVatId: client.showVatId,
    einvoiceStandard: client.einvoiceStandard,
    paymentTermsDays: client.paymentTermsDays,
    discountDays: client.discountDays,
    discountPercent: client.discountPercent,
    customerDiscount: client.customerDiscount,
    customerDiscountUnit: client.customerDiscountUnit,
    terms: client.terms ?? "",
    debtorNumber: client.debtorNumber ?? "",
    creditorNumber: client.creditorNumber ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    vatNumber: client.vatNumber ?? "",
    addressLine1: client.addressLine1 ?? "",
    addressLine2: client.addressLine2 ?? "",
    city: client.city ?? "",
    region: client.region ?? "",
    postalCode: client.postalCode ?? "",
    countryCode: client.countryCode ?? "DE",
    notes: client.notes ?? "",
  };
}

/**
 * Create- and edit-contact dialog.
 *
 * <p>One component for both, because a contact edited through a different form from the one it was
 * created in is how the two drift apart and a field ends up editable in only one of them.
 * Passing a {@code client} switches it to editing that record.
 *
 * <p>"Create and new" keeps the dialog open for the next entry, which is what makes bulk entry
 * bearable when someone is typing in a stack of clients. It has no meaning when editing, so it is
 * not shown there.
 */
export function ClientDialog({
  open,
  onClose,
  onCreated,
  client,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (client: Client) => void;
  /** When set, the dialog edits this contact instead of creating a new one. */
  client?: Client | null;
}) {
  const editing = Boolean(client);
  // Seeded once on mount rather than synchronised by an effect. The parent gives the dialog a
  // key of the contact's id, so opening a different contact remounts it with fresh values —
  // which is React's own answer to "reset state when the subject changes".
  const t = useT();
  const d = t.clientDialog;
  const [form, setForm] = useState<ClientInput>(() => (client ? seedFrom(client) : EMPTY));
  const [section, setSection] = useState<Section>("address");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextNumber, setNextNumber] = useState<number | null>(null);
  const [details, setDetails] = useState<ContactDetailInput[]>(() =>
    // An existing contact keeps exactly the rows it has; the blank starter pair is for new ones.
    client && client.contactDetails.length > 0
      ? client.contactDetails.map((d) => ({ kind: d.kind, label: d.label, value: d.value }))
      : [
          { kind: "phone", label: "work", value: "" },
          { kind: "email", label: "work", value: "" },
        ],
  );

  function setDetail(index: number, patch: Partial<ContactDetailInput>) {
    setDetails((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addDetail(kind: ContactDetailInput["kind"]) {
    setDetails((rows) => [...rows, { kind, label: "work", value: "" }]);
  }

  function removeDetail(index: number) {
    setDetails((rows) => rows.filter((_, i) => i !== index));
  }

  // Shown so the number is not a surprise after saving. The server still allocates it on create,
  // so two people with the form open at once cannot end up with the same one.
  useEffect(() => {
    if (!open || editing) return;
    let cancelled = false;
    peekNextCustomerNumber()
      .then((value) => {
        if (!cancelled) setNextNumber(value);
      })
      .catch(() => {
        if (!cancelled) setNextNumber(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editing]);

  function set<K extends keyof ClientInput>(key: K, value: ClientInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setForm(client ? seedFrom(client) : EMPTY);
    setSection("address");
    setError(null);
    setDetails(
      client && client.contactDetails.length > 0
        ? client.contactDetails.map((d) => ({ kind: d.kind, label: d.label, value: d.value }))
        : [
            { kind: "phone", label: "work", value: "" },
            { kind: "email", label: "work", value: "" },
          ],
    );
  }

  async function submit(keepOpen: boolean) {
    const isPerson = form.type === "individual";
    if (isPerson && !(form.lastName ?? "").trim()) {
      setError(d.lastNameRequired);
      return;
    }
    if (!isPerson && !form.name.trim()) {
      setError(d.orgNameRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // Blank optional fields are sent as null rather than "", so the API stores an absent value
      // instead of an empty string.
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, typeof v === "string" && v.trim() === "" ? null : v]),
      ) as ClientInput;

      const fallbackName = isPerson
        ? [form.firstName, form.lastName].filter(Boolean).join(" ").trim()
        : form.name.trim();
      const body = {
        ...payload,
        name: fallbackName,
        // Blank rows are dropped server-side; sending them keeps the form simple.
        contactDetails: details.filter((row) => row.value.trim() !== ""),
      };

      const saved = client
        ? await updateClient(client.id, body)
        : await createClient(body);
      onCreated(saved);

      // Editing always closes: there is no "and next" for a record that already exists.
      if (keepOpen && !client) {
        reset();
      } else {
        reset();
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : client
            ? d.saveError
            : d.createError,
      );
    } finally {
      setSaving(false);
    }
  }

  const isOrganisation = form.type === "business";

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={editing ? d.titleEdit : d.titleCreate}
      headerAside={
        /* Pinned rather than sitting in the body: it changes which fields exist, so it has to
           stay reachable once the form is scrolled. */
        <div className="inline-flex rounded-lg border border-border p-1">
          {(
            [
              ["individual", d.typePerson],
              ["business", d.typeOrganisation],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => set("type", value)}
              aria-pressed={form.type === value}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm transition-colors",
                form.type === value
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      }
      footer={
        <>
          {error ? <p className="mr-auto text-sm text-red-600">{error}</p> : null}
          <button
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
            className="h-10 rounded-lg px-4 text-sm font-medium text-foreground hover:bg-slate-100"
          >
            {d.cancel}
          </button>
          {/* No "and new" when editing: the record already exists. */}
          {!editing ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => submit(true)}
              className="h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground hover:bg-slate-50 disabled:opacity-60"
            >
              {d.createAndNew}
            </button>
          ) : null}
          <button
            type="button"
            disabled={saving}
            onClick={() => submit(false)}
            className="h-10 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-60"
          >
            {saving
              ? editing
                ? d.saving
                : d.creating
              : editing
                ? d.saveChanges
                : d.create}
          </button>
        </>
      }
    >
      {isOrganisation ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={d.orgName}
            required
            value={form.name}
            onChange={(v) => set("name", v)}
            placeholder={d.orgNamePlaceholder}
          />
          <Field
            label={d.contactPerson}
            value={form.contactName ?? ""}
            onChange={(v) => set("contactName", v)}
            placeholder={d.contactPersonPlaceholder}
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label={d.salutation}
            value={form.salutation ?? ""}
            onChange={(v) => set("salutation", v)}
            options={SALUTATIONS}
            labels={salutationLabels(d)}
          />
          <Field
            label={d.titleField}
            value={form.academicTitle ?? ""}
            onChange={(v) => set("academicTitle", v)}
            placeholder={d.titlePlaceholder}
          />
          <Field
            label={d.firstName}
            value={form.firstName ?? ""}
            onChange={(v) => set("firstName", v)}
            placeholder={d.firstNamePlaceholder}
          />
          <Field
            label={d.lastName}
            required
            value={form.lastName ?? ""}
            onChange={(v) => set("lastName", v)}
            placeholder={d.lastNamePlaceholder}
          />
          <Field
            label={d.nameSuffix}
            value={form.nameSuffix ?? ""}
            onChange={(v) => set("nameSuffix", v)}
            placeholder={d.nameSuffixPlaceholder}
          />
          <div className="sm:col-span-2">
            <Field
              label={d.organisation}
              value={form.contactName ?? ""}
              onChange={(v) => set("contactName", v)}
              placeholder={d.organisationPlaceholder}
            />
          </div>
          <div className="sm:col-span-2">
            <Field
              label={d.position}
              value={form.position ?? ""}
              onChange={(v) => set("position", v)}
              placeholder={d.positionPlaceholder}
            />
          </div>
        </div>
      )}

      <div className="mt-6 border-t border-border pt-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
          Numbering
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Field
            label={d.customerNo}
            value={form.customerNumber != null ? String(form.customerNumber) : ""}
            onChange={(v) => set("customerNumber", v.trim() === "" ? null : Number(v))}
            placeholder={nextNumber != null ? String(nextNumber) : "auto"}
            hint={
              // An existing contact already has its number; only a new one is waiting for one.
              editing
                ? d.renumberHint
                : nextNumber != null
                  ? `Blank uses ${nextNumber}`
                  : d.autoAssigned
            }
          />
          <Select
            label={d.typeLabel}
            value={form.contactRole ?? "customer"}
            onChange={(v) => set("contactRole", v)}
            options={[...ROLES]}
            labels={d.roles}
          />
          <Field
            label={d.debtorNo}
            value={form.debtorNumber ?? ""}
            onChange={(v) => set("debtorNumber", v)}
            hint={d.accountantRef}
          />
          <Field
            label={d.creditorNo}
            value={form.creditorNumber ?? ""}
            onChange={(v) => set("creditorNumber", v)}
          />
        </div>
      </div>

      <div className="mt-6">
        <Toggle
          label={d.eInvoiceStandard}
          hint={d.eInvoiceHint}
          checked={Boolean(form.einvoiceStandard)}
          onChange={(v) => set("einvoiceStandard", v)}
        />
      </div>

      {/* Section tabs */}
      <div className="mt-6 flex flex-wrap gap-1 border-b border-border">
        {SECTIONS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setSection(name)}
            aria-pressed={section === name}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm transition-colors",
              section === name
                ? "border-primary font-medium text-primary"
                : "border-transparent text-muted hover:text-foreground",
            )}
          >
            {d.sections[name]}
          </button>
        ))}
      </div>

      <div className="pt-5">
        {section === "address" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={d.street} value={form.addressLine1 ?? ""} onChange={(v) => set("addressLine1", v)} />
            <Field label={d.addressLine2} value={form.addressLine2 ?? ""} onChange={(v) => set("addressLine2", v)} />
            <Field label={d.postcode} value={form.postalCode ?? ""} onChange={(v) => set("postalCode", v)} placeholder={d.postcodePlaceholder} />
            <Field label={d.city} value={form.city ?? ""} onChange={(v) => set("city", v)} placeholder={d.cityPlaceholder} />
            <Field label={d.region} value={form.region ?? ""} onChange={(v) => set("region", v)} />
            <Field
              label={d.countryCode}
              value={form.countryCode ?? ""}
              onChange={(v) => set("countryCode", v.toUpperCase().slice(0, 2))}
              placeholder={d.countryCodePlaceholder}
              hint={d.countryHint}
            />
          </div>
        ) : null}

        {section === "contactDetails" ? (
          <div className="space-y-6">
            <DetailGroup
              title={d.telephone}
              kind="phone"
              details={details}
              onChange={setDetail}
              onAdd={() => addDetail("phone")}
              onRemove={removeDetail}
              addLabel={d.addPhone}
              placeholder={d.phonePlaceholder}
            />
            <DetailGroup
              title={d.emailAddress}
              kind="email"
              details={details}
              onChange={setDetail}
              onAdd={() => addDetail("email")}
              onRemove={removeDetail}
              addLabel={d.addEmail}
              placeholder={d.emailPlaceholder}
              type="email"
            />
            <DetailGroup
              title={d.website}
              kind="website"
              details={details}
              onChange={setDetail}
              onAdd={() => addDetail("website")}
              onRemove={removeDetail}
              addLabel={d.addDomain}
              placeholder={d.websitePlaceholder}
            />
          </div>
        ) : null}

        {section === "paymentInformation" ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={d.iban}
                value={form.iban ?? ""}
                onChange={(v) => set("iban", v.toUpperCase())}
                placeholder={d.ibanPlaceholder}
                hint={d.ibanHint}
              />
              <Field
                label={d.bic}
                value={form.bic ?? ""}
                onChange={(v) => set("bic", v.toUpperCase())}
                placeholder={d.bicPlaceholder}
              />
              <Field
                label={d.vatId}
                value={form.vatNumber ?? ""}
                onChange={(v) => set("vatNumber", v.toUpperCase())}
                placeholder={d.vatIdPlaceholder}
                hint="The EU VAT identification number (USt-IdNr.). Required on reverse-charge and intra-EU invoices."
              />
              <Field
                label={d.taxId}
                value={form.taxNumber ?? ""}
                onChange={(v) => set("taxNumber", v)}
                placeholder={d.taxIdPlaceholder}
                hint="The domestic tax number from your local tax office (Steuernummer). Not the same as the VAT ID."
              />
            </div>

            <Toggle
              label={d.showVatId}
              hint={d.showVatIdHint}
              checked={Boolean(form.showVatId)}
              onChange={(v) => set("showVatId", v)}
            />
          </div>
        ) : null}

        {section === "termsAndConditions" ? (
          <div className="space-y-5">
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">{d.earlyPaymentDiscount}</p>
              <p className="mb-3 text-xs text-muted">
                Deducted only if they actually pay inside the window, so the invoice total is
                unchanged when it is issued. Known in Germany as Skonto.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <NumberField
                  label={d.discountWithin}
                  value={form.discountDays}
                  onChange={(v) => set("discountDays", v)}
                  placeholder={d.discountWithinPlaceholder}
                  min={0}
                />
                <NumberField
                  label={d.discountPercent}
                  value={form.discountPercent}
                  onChange={(v) => set("discountPercent", v)}
                  placeholder="2.00"
                  min={0}
                  max={100}
                  step="0.01"
                  suffix="%"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField
                label={d.paymentTermDays}
                value={form.paymentTermsDays}
                onChange={(v) => set("paymentTermsDays", v)}
                placeholder={d.paymentTermPlaceholder}
                min={0}
                hint={d.paymentTermHint}
              />
              <div>
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Customer discount
                </span>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.customerDiscount ?? ""}
                    aria-label={d.customerDiscountAria}
                    onChange={(event) =>
                      set(
                        "customerDiscount",
                        event.target.value === "" ? null : Number(event.target.value),
                      )
                    }
                    className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  {/* The unit sits against the amount because the number means nothing alone. */}
                  <select
                    value={form.customerDiscountUnit ?? "percent"}
                    aria-label={d.customerDiscountUnitAria}
                    onChange={(event) =>
                      set("customerDiscountUnit", event.target.value as DiscountUnit)
                    }
                    className="h-10 w-24 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
                  >
                    <option value="percent">%</option>
                    <option value="absolute">&euro;</option>
                  </select>
                </div>
                <span className="mt-1 block text-xs text-muted">
                  Always applied, unlike the early payment discount above.
                </span>
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Terms printed on their documents
              </span>
              <textarea
                rows={4}
                value={form.terms ?? ""}
                onChange={(event) => set("terms", event.target.value)}
                placeholder={d.termsPlaceholder}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>
        ) : null}

        {section === "notes" ? (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">{d.notesLabel}</span>
            <textarea
              rows={5}
              value={form.notes ?? ""}
              onChange={(event) => set("notes", event.target.value)}
              placeholder={d.notesPlaceholder}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        ) : null}
      </div>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  min,
  max,
  step,
  suffix,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: string;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          placeholder={placeholder}
          // Empty stays null rather than collapsing to 0 — "no term agreed" is not "zero days".
          onChange={(event) =>
            onChange(event.target.value === "" ? null : Number(event.target.value))
          }
          className={cn(
            "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            suffix && "pr-8",
          )}
        />
        {suffix ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            {suffix}
          </span>
        ) : null}
      </div>
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {/* `labels` covers every option this is used with, including the empty
                salutation; falling back to the raw value keeps it generic. */}
            {labels?.[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * One kind of contact detail, with its rows and an add link.
 *
 * <p>An entry labelled "Billing address" becomes the address invoices are sent to, which is why
 * the label sits next to the value rather than being buried in a sub-form.
 */
function DetailGroup({
  title,
  kind,
  details,
  onChange,
  onAdd,
  onRemove,
  addLabel,
  placeholder,
  type = "text",
}: {
  title: string;
  kind: ContactDetailInput["kind"];
  details: ContactDetailInput[];
  onChange: (index: number, patch: Partial<ContactDetailInput>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  addLabel: string;
  placeholder: string;
  type?: string;
}) {
  const t = useT();
  const d = t.clientDialog;

  const rows = details
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row.kind === kind);

  return (
    <div>
      <p className="mb-2 text-sm font-medium text-foreground">{title}</p>
      <div className="space-y-2">
        {rows.map(({ row, index }) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <input
              type={type}
              value={row.value}
              placeholder={placeholder}
              onChange={(event) => onChange(index, { value: event.target.value })}
              aria-label={format(d.valueAria, { kind: title })}
              className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={row.label}
              onChange={(event) => onChange(index, { label: event.target.value })}
              aria-label={format(d.labelAria, { kind: title })}
              className="h-10 w-40 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
            >
              {DETAIL_LABELS.map((value) => (
                <option key={value} value={value}>
                  {d.detailLabels[value]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={rows.length === 1}
              aria-label={format(d.removeThisAria, { kind: title })}
              title={rows.length === 1 ? d.keepAtLeastOne : d.remove}
              className="grid size-10 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
              </svg>
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 text-sm font-medium text-primary hover:underline"
      >
        + {addLabel}
      </button>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "size-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-[1.375rem]" : "translate-x-0.5",
          )}
        />
      </button>
      <span>
        <span className="block text-sm font-medium text-foreground">{label}</span>
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </div>
  );
}
