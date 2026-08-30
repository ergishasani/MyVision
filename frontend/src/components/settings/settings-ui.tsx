"use client";

import { cn } from "@/lib/utils/cn";

/* ---------------------------------------------------------------------------
 * Building blocks for the settings screens.
 *
 * `Panel` in page-shell.tsx is a display-only card for scaffold pages. These are the interactive
 * equivalents: a card that holds controls, and a labelled row that keeps the label column aligned
 * across every settings page so the section reads as a list rather than a pile of forms.
 * ------------------------------------------------------------------------ */

export function SettingsCard({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </header>

      <div className="divide-y divide-border">{children}</div>

      {footer ? (
        <footer className="flex items-center justify-end gap-3 border-t border-border bg-slate-50/70 px-5 py-3">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

/**
 * One labelled setting.
 *
 * <p>Stacks on narrow screens and splits into label/control columns from `sm` up. The control
 * column is width-capped so a lone select does not stretch across an ultrawide display.
 */
export function SettingsRow({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:pt-1.5">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium text-foreground"
        >
          {label}
        </label>
        {description ? <p className="mt-1 max-w-md text-sm text-muted">{description}</p> : null}
      </div>

      <div className="w-full shrink-0 sm:w-72">{children}</div>
    </div>
  );
}

const FIELD_CLASS = cn(
  "w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground",
  "placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
);

export function TextInput({
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  suffix,
  inputMode,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "url" | "number";
  placeholder?: string;
  /** Trailing unit, e.g. "days". Rendered outside the field so it is not mistaken for content. */
  suffix?: string;
  inputMode?: "numeric" | "decimal";
}) {
  const input = (
    <input
      id={id}
      type={type}
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={cn(FIELD_CLASS, "h-10")}
    />
  );

  if (!suffix) return input;

  return (
    <div className="flex items-center gap-2">
      {input}
      <span className="shrink-0 text-sm text-muted">{suffix}</span>
    </div>
  );
}

export function Textarea({
  id,
  value,
  onChange,
  rows = 4,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      id={id}
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(FIELD_CLASS, "resize-y py-2 leading-relaxed")}
    />
  );
}

export function Select({
  id,
  value,
  onChange,
  options,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground",
        "focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Radio group rendered as selectable cards.
 *
 * <p>Used where the choice is short and worth showing at a glance — language, currency position —
 * rather than hiding both options behind a closed select.
 */
export function RadioCards<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; hint?: string }[];
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
              selected
                ? "border-primary bg-primary/5"
                : "border-border bg-card hover:bg-slate-50",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full border",
                selected ? "border-primary" : "border-slate-300",
              )}
            >
              {selected ? <span className="size-2 rounded-full bg-primary" /> : null}
            </span>

            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">{option.label}</span>
              {option.hint ? (
                <span className="block text-xs text-muted">{option.hint}</span>
              ) : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
