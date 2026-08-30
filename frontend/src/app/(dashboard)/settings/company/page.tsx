"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/layout/page-shell";
import { useLocale, useT } from "@/components/providers/locale-provider";
import {
  RadioCards,
  Select,
  SettingsCard,
  SettingsRow,
  TextInput,
  Textarea,
} from "@/components/settings/settings-ui";
import { ApiError } from "@/lib/api/client";
import { getCompanyProfile, updateCompanyProfile, uploadCompanyLogo } from "@/lib/api/company";
import { countryOptions } from "@/lib/countries";
import type { CompanyProfile, PaymentMethod } from "@/types/api";
import { cn } from "@/lib/utils/cn";

/* ---------------------------------------------------------------------------
 * Company profile.
 *
 * Everything here is printed on documents a customer receives, so the page saves explicitly
 * rather than on blur: a half-typed VAT number silently persisted is worse than one that needs a
 * deliberate click.
 * ------------------------------------------------------------------------ */

/** Fields edited as free text. Numbers are held as strings too and parsed on save. */
const TEXT_FIELDS = [
  "name",
  "legalName",
  "email",
  "phone",
  "website",
  "vatNumber",
  "registrationNumber",
  "addressLine1",
  "addressLine2",
  "postalCode",
  "city",
  "region",
  "countryCode",
  "bankName",
  "iban",
  "bic",
  "defaultCurrency",
  "defaultLanguage",
  "defaultPaymentMethod",
  "paymentTermsDays",
  "defaultVatRate",
  "invoiceFooter",
  "quoteFooter",
] as const;

type Field = (typeof TEXT_FIELDS)[number];
type Draft = Record<Field, string>;

const NUMERIC_FIELDS = new Set<Field>(["paymentTermsDays", "defaultVatRate"]);

const CURRENCIES = ["EUR", "USD", "GBP", "CHF"];
const PAYMENT_METHODS: PaymentMethod[] = [
  "bank_transfer",
  "cash",
  "card",
  "paypal",
  "stripe",
  "other",
];

function toDraft(profile: CompanyProfile): Draft {
  const draft = {} as Draft;
  for (const field of TEXT_FIELDS) {
    const value = profile[field as keyof CompanyProfile];
    draft[field] = value === null || value === undefined ? "" : String(value);
  }
  return draft;
}

export default function CompanySettingsPage() {
  const t = useT();
  const { locale } = useLocale();

  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCompanyProfile()
      .then((loaded) => {
        setProfile(loaded);
        setDraft(toDraft(loaded));
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : t.settings.company.loadError),
      )
      .finally(() => setLoading(false));
    // The dictionary is only read for the failure message; re-running on a language switch would
    // refetch the profile for no reason.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const baseline = useMemo(() => (profile ? toDraft(profile) : null), [profile]);

  const changed = useMemo<Field[]>(() => {
    if (!draft || !baseline) return [];
    return TEXT_FIELDS.filter((field) => draft[field] !== baseline[field]);
  }, [draft, baseline]);

  const countries = useMemo(
    () => countryOptions(locale, draft?.countryCode),
    [locale, draft?.countryCode],
  );

  function set(field: Field, value: string) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setSaved(false);
  }

  async function save() {
    if (!draft || changed.length === 0) return;
    setSaving(true);
    setError(null);

    // Only the fields that actually moved. The endpoint treats a null as "leave alone", so
    // sending the whole object would be harmless but would also overwrite anything a second
    // browser tab changed in the meantime.
    const patch: Record<string, string | number | null> = {};
    for (const field of changed) {
      const raw = draft[field].trim();
      if (NUMERIC_FIELDS.has(field)) {
        patch[field] = raw === "" ? null : Number(raw);
      } else {
        patch[field] = raw === "" ? null : raw;
      }
    }

    try {
      const updated = await updateCompanyProfile(patch as Partial<CompanyProfile>);
      setProfile(updated);
      setDraft(toDraft(updated));
      setSaved(true);
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : t.common.genericError);
    } finally {
      setSaving(false);
    }
  }

  async function onLogoPicked(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadCompanyLogo(file);
      setProfile((current) => (current ? { ...current, logoUrl: url } : current));
    } catch (err: unknown) {
      setError(err instanceof ApiError ? err.message : t.common.genericError);
    } finally {
      setUploading(false);
      // Lets the same file be picked again after a failed upload; without this the input still
      // holds it and the change event never fires.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.settings.company.title} description={t.settings.company.description} />
        <p className="text-sm text-muted">{t.common.loading}</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="space-y-6">
        <PageHeader title={t.settings.company.title} description={t.settings.company.description} />
        <ErrorBanner message={error ?? t.settings.company.loadError} onDismiss={null} />
      </div>
    );
  }

  const c = t.settings.company;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title={c.title} description={c.description} />

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsCard title={c.identity.title} description={c.identity.description}>
          <SettingsRow label={c.identity.name} description={c.identity.nameHint} htmlFor="name">
            <TextInput id="name" value={draft.name} onChange={(v) => set("name", v)} />
          </SettingsRow>
          <SettingsRow
            label={c.identity.legalName}
            description={c.identity.legalNameHint}
            htmlFor="legalName"
          >
            <TextInput id="legalName" value={draft.legalName} onChange={(v) => set("legalName", v)} />
          </SettingsRow>
          <SettingsRow label={c.identity.email} htmlFor="email">
            <TextInput id="email" type="email" value={draft.email} onChange={(v) => set("email", v)} />
          </SettingsRow>
          <SettingsRow label={c.identity.phone} htmlFor="phone">
            <TextInput id="phone" value={draft.phone} onChange={(v) => set("phone", v)} />
          </SettingsRow>
          <SettingsRow label={c.identity.website} htmlFor="website">
            <TextInput id="website" type="url" value={draft.website} onChange={(v) => set("website", v)} />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title={c.tax.title} description={c.tax.description}>
          <SettingsRow label={c.tax.vatNumber} htmlFor="vatNumber">
            <TextInput id="vatNumber" value={draft.vatNumber} onChange={(v) => set("vatNumber", v)} />
          </SettingsRow>
          <SettingsRow label={c.tax.registrationNumber} htmlFor="registrationNumber">
            <TextInput
              id="registrationNumber"
              value={draft.registrationNumber}
              onChange={(v) => set("registrationNumber", v)}
            />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title={c.address.title} description={c.address.description}>
          <SettingsRow label={c.address.line1} htmlFor="addressLine1">
            <TextInput id="addressLine1" value={draft.addressLine1} onChange={(v) => set("addressLine1", v)} />
          </SettingsRow>
          <SettingsRow label={c.address.line2} htmlFor="addressLine2">
            <TextInput id="addressLine2" value={draft.addressLine2} onChange={(v) => set("addressLine2", v)} />
          </SettingsRow>
          <SettingsRow label={c.address.postalCode} htmlFor="postalCode">
            <TextInput id="postalCode" value={draft.postalCode} onChange={(v) => set("postalCode", v)} />
          </SettingsRow>
          <SettingsRow label={c.address.city} htmlFor="city">
            <TextInput id="city" value={draft.city} onChange={(v) => set("city", v)} />
          </SettingsRow>
          <SettingsRow label={c.address.region} htmlFor="region">
            <TextInput id="region" value={draft.region} onChange={(v) => set("region", v)} />
          </SettingsRow>
          <SettingsRow label={c.address.country} htmlFor="countryCode">
            <Select
              id="countryCode"
              value={draft.countryCode}
              onChange={(v) => set("countryCode", v)}
              options={countries.map((country) => ({ value: country.code, label: country.name }))}
            />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title={c.banking.title} description={c.banking.description}>
          <SettingsRow label={c.banking.bankName} htmlFor="bankName">
            <TextInput id="bankName" value={draft.bankName} onChange={(v) => set("bankName", v)} />
          </SettingsRow>
          <SettingsRow label={c.banking.iban} htmlFor="iban">
            <TextInput id="iban" value={draft.iban} onChange={(v) => set("iban", v)} />
          </SettingsRow>
          <SettingsRow label={c.banking.bic} htmlFor="bic">
            <TextInput id="bic" value={draft.bic} onChange={(v) => set("bic", v)} />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title={c.defaults.title} description={c.defaults.description}>
          <SettingsRow label={c.defaults.currency} htmlFor="defaultCurrency">
            <Select
              id="defaultCurrency"
              value={draft.defaultCurrency}
              onChange={(v) => set("defaultCurrency", v)}
              options={CURRENCIES.map((code) => ({ value: code, label: code }))}
            />
          </SettingsRow>
          <SettingsRow
            label={c.defaults.language}
            description={c.defaults.languageHint}
            htmlFor="defaultLanguage"
          >
            <Select
              id="defaultLanguage"
              value={draft.defaultLanguage}
              onChange={(v) => set("defaultLanguage", v)}
              options={[
                { value: "en", label: "English" },
                { value: "de", label: "Deutsch" },
              ]}
            />
          </SettingsRow>
          <SettingsRow label={c.defaults.paymentTerms} htmlFor="paymentTermsDays">
            <TextInput
              id="paymentTermsDays"
              type="number"
              inputMode="numeric"
              suffix={c.defaults.paymentTermsSuffix}
              value={draft.paymentTermsDays}
              onChange={(v) => set("paymentTermsDays", v)}
            />
          </SettingsRow>
          <SettingsRow label={c.defaults.vatRate} htmlFor="defaultVatRate">
            <TextInput
              id="defaultVatRate"
              type="number"
              inputMode="decimal"
              suffix="%"
              value={draft.defaultVatRate}
              onChange={(v) => set("defaultVatRate", v)}
            />
          </SettingsRow>
          <SettingsRow label={c.defaults.paymentMethod}>
            <RadioCards
              name={c.defaults.paymentMethod}
              value={draft.defaultPaymentMethod as PaymentMethod}
              onChange={(v) => set("defaultPaymentMethod", v)}
              options={PAYMENT_METHODS.map((method) => ({
                value: method,
                label: c.paymentMethods[method],
              }))}
            />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard title={c.logo.title} description={c.logo.description}>
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center">
            <div className="grid h-20 w-32 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-slate-50">
              {profile?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.logoUrl}
                  alt={c.logo.title}
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <span className="px-2 text-center text-xs text-muted">{c.logo.none}</span>
              )}
            </div>

            <div className="min-w-0">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(event) => onLogoPicked(event.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "inline-flex h-9 items-center rounded-lg border border-border bg-card px-3",
                  "text-sm font-medium text-foreground hover:bg-slate-50 disabled:opacity-60",
                )}
              >
                {uploading ? c.logo.uploading : profile?.logoUrl ? c.logo.replace : c.logo.upload}
              </button>
              <p className="mt-2 text-xs text-muted">{c.logo.constraints}</p>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard title={c.footers.title} description={c.footers.description}>
          <SettingsRow label={c.footers.invoiceFooter} htmlFor="invoiceFooter">
            <Textarea
              id="invoiceFooter"
              value={draft.invoiceFooter}
              onChange={(v) => set("invoiceFooter", v)}
            />
          </SettingsRow>
          <SettingsRow label={c.footers.quoteFooter} htmlFor="quoteFooter">
            <Textarea
              id="quoteFooter"
              value={draft.quoteFooter}
              onChange={(v) => set("quoteFooter", v)}
            />
          </SettingsRow>
        </SettingsCard>
      </div>

      <SaveBar
        dirty={changed.length > 0}
        saving={saving}
        saved={saved}
        labels={{
          save: t.common.save,
          saving: t.common.saving,
          savedLabel: t.common.saved,
          unsaved: t.common.changesNotSaved,
          cancel: t.common.cancel,
        }}
        onSave={save}
        onReset={() => {
          if (baseline) setDraft(baseline);
        }}
      />
    </div>
  );
}

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: (() => void) | null;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-700">{message}</p>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-sm font-medium text-red-700 hover:underline"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

/**
 * Sticky save bar.
 *
 * <p>Only appears once something has changed, so the page is not permanently wearing a toolbar
 * that does nothing. It sits above the content rather than at the end of it because the form is
 * long enough that a button at the bottom would be off-screen while you are editing the top.
 */
function SaveBar({
  dirty,
  saving,
  saved,
  labels,
  onSave,
  onReset,
}: {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  labels: {
    save: string;
    saving: string;
    savedLabel: string;
    unsaved: string;
    cancel: string;
  };
  onSave: () => void;
  onReset: () => void;
}) {
  if (!dirty) {
    return saved ? (
      <p className="text-sm text-emerald-700">{labels.savedLabel}</p>
    ) : null;
  }

  return (
    <div className="sticky bottom-4 z-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg">
        <p className="text-sm text-muted">{labels.unsaved}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={saving}
            className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-slate-50 disabled:opacity-60"
          >
            {labels.cancel}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? labels.saving : labels.save}
          </button>
        </div>
      </div>
    </div>
  );
}
