"use client";

import { PageHeader } from "@/components/layout/page-shell";
import { RadioCards, SettingsCard, SettingsRow } from "@/components/settings/settings-ui";
import { useLocale, useT } from "@/components/providers/locale-provider";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/dictionaries";

/**
 * Intl tags for each interface language.
 *
 * <p>Matches what the backend uses when it renders a PDF (`Locale.UK` / `Locale.GERMANY` in
 * InvoiceDocumentService), so the preview below is not quietly nicer than the real output.
 */
const INTL_TAGS: Record<Locale, string> = {
  en: "en-GB",
  de: "de-DE",
};

const SAMPLE_DATE = new Date(2026, 10, 4);
const SAMPLE_NUMBER = 1234.56;

export default function GeneralSettingsPage() {
  const t = useT();
  const { locale, setLocale } = useLocale();
  const tag = INTL_TAGS[locale];

  const samples = [
    {
      label: t.settings.general.formatting.date,
      value: new Intl.DateTimeFormat(tag, { dateStyle: "long" }).format(SAMPLE_DATE),
    },
    {
      label: t.settings.general.formatting.number,
      value: new Intl.NumberFormat(tag, { minimumFractionDigits: 2 }).format(SAMPLE_NUMBER),
    },
    {
      label: t.settings.general.formatting.currency,
      value: new Intl.NumberFormat(tag, { style: "currency", currency: "EUR" }).format(
        SAMPLE_NUMBER,
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t.settings.general.title}
        description={t.settings.general.description}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard
          title={t.settings.general.language.title}
          description={t.settings.general.language.description}
        >
          <SettingsRow
            label={t.settings.general.language.label}
            description={t.settings.general.language.hint}
          >
            <RadioCards
              name={t.settings.general.language.label}
              value={locale}
              onChange={setLocale}
              options={LOCALES.map((value) => ({ value, label: LOCALE_NAMES[value] }))}
            />
          </SettingsRow>
        </SettingsCard>

        <SettingsCard
          title={t.settings.general.formatting.title}
          description={t.settings.general.formatting.description}
        >
          {samples.map((sample) => (
            <SettingsRow key={sample.label} label={sample.label}>
              <p className="text-sm tabular-nums text-foreground sm:text-right">{sample.value}</p>
            </SettingsRow>
          ))}

          <div className="px-5 py-4">
            <p className="text-sm text-muted">{t.settings.general.formatting.note}</p>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}
