"use client";

import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import {
  createProduct,
  peekNextArticleNumber,
  updateProduct,
  type ProductUnitInput,
} from "@/lib/api/products";
import type { Product, ProductCategory, ProductUnitCode } from "@/types/api";
import { useT } from "@/components/providers/locale-provider";
import { format } from "@/lib/i18n/format";
import { UNIT_ORDER } from "@/lib/utils/product-units";
import { cn } from "@/lib/utils/cn";

/** Section keys, deliberately not the visible labels — those change with the language. */
const SECTIONS = ["description", "otherUnits", "moreSettings"] as const;
type Section = (typeof SECTIONS)[number];

/** The German rates. Not an exhaustive list of what the column accepts. */
const TAX_RATES = ["0", "7", "19"];

type Draft = {
  name: string;
  articleNumber: string;
  category: ProductCategory;
  unit: ProductUnitCode;
  taxRate: string;
  sellingNet: string;
  sellingGross: string;
  purchaseNet: string;
  purchaseGross: string;
  description: string;
  internalNote: string;
  inventoryEnabled: boolean;
};

const EMPTY: Draft = {
  name: "",
  articleNumber: "",
  category: "article",
  unit: "pcs",
  taxRate: "19",
  sellingNet: "",
  sellingGross: "",
  purchaseNet: "",
  purchaseGross: "",
  description: "",
  internalNote: "",
  inventoryEnabled: false,
};

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  // Accept the comma decimal separator people actually type on a German keyboard.
  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number) {
  return value.toFixed(2);
}

/** The stored product, as the form's own shape. Mirrors {@link EMPTY} field for field. */
function seedFrom(product: Product): Draft {
  const rate = Number(product.taxRate);
  const gross = (net: number | null) =>
    net === null ? "" : money(net * (1 + rate / 100));
  return {
    name: product.name,
    articleNumber: product.articleNumber != null ? String(product.articleNumber) : "",
    category: product.category,
    unit: product.unit,
    taxRate: String(rate),
    sellingNet: money(Number(product.sellingPriceNet)),
    sellingGross: gross(Number(product.sellingPriceNet)),
    purchaseNet: product.purchasePriceNet != null ? money(Number(product.purchasePriceNet)) : "",
    purchaseGross: gross(product.purchasePriceNet != null ? Number(product.purchasePriceNet) : null),
    description: product.description ?? "",
    internalNote: product.internalNote ?? "",
    inventoryEnabled: product.inventoryEnabled,
  };
}

/**
 * Create- and edit-product dialog.
 *
 * <p>Net and gross are two views of one price, so editing either rewrites the other rather than
 * both being stored. Only the net figure is sent — the API derives gross on read, which is what
 * keeps a product from carrying two prices that disagree.
 */
export function ProductDialog({
  open,
  onClose,
  onCreated,
  product,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (product: Product) => void;
  /** When set, the dialog edits this product instead of creating a new one. */
  product?: Product | null;
}) {
  const t = useT();
  const d = t.productDialog;
  const editing = Boolean(product);
  // Seeded once on mount. The parent keys the dialog on the product id, so opening a different
  // one remounts it with fresh values rather than an effect copying props into state.
  const [form, setForm] = useState<Draft>(() => (product ? seedFrom(product) : EMPTY));
  const [section, setSection] = useState<Section>("description");
  const [units, setUnits] = useState<ProductUnitInput[]>(() =>
    product ? product.units.map((u) => ({ unit: u.unit, factor: Number(u.factor) })) : [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextNumber, setNextNumber] = useState<number | null>(null);

  // Shown so the number is not a surprise after saving. The server still allocates it on create,
  // so two people with the form open at once cannot end up with the same one.
  useEffect(() => {
    if (!open || editing) return;
    let cancelled = false;
    peekNextArticleNumber()
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

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const rate = toNumber(form.taxRate) ?? 0;

  /** Typing in a net box fills the gross box beside it, and the other way round. */
  function setPrice(which: "selling" | "purchase", side: "net" | "gross", raw: string) {
    const value = toNumber(raw);
    const netKey = which === "selling" ? "sellingNet" : "purchaseNet";
    const grossKey = which === "selling" ? "sellingGross" : "purchaseGross";

    setForm((prev) => {
      if (value === null) {
        // Clearing one box clears its partner, rather than leaving a stale number that looks
        // like it was derived from what is now an empty field.
        return { ...prev, [netKey]: side === "net" ? raw : "", [grossKey]: side === "gross" ? raw : "" };
      }
      return side === "net"
        ? { ...prev, [netKey]: raw, [grossKey]: money(value * (1 + rate / 100)) }
        : { ...prev, [grossKey]: raw, [netKey]: money(value / (1 + rate / 100)) };
    });
  }

  /** A rate change moves gross and leaves net alone: net is what we actually charge. */
  function setTaxRate(raw: string) {
    const next = toNumber(raw) ?? 0;
    setForm((prev) => {
      const sellingNet = toNumber(prev.sellingNet);
      const purchaseNet = toNumber(prev.purchaseNet);
      return {
        ...prev,
        taxRate: raw,
        sellingGross: sellingNet === null ? prev.sellingGross : money(sellingNet * (1 + next / 100)),
        purchaseGross:
          purchaseNet === null ? prev.purchaseGross : money(purchaseNet * (1 + next / 100)),
      };
    });
  }

  function reset() {
    setForm(product ? seedFrom(product) : EMPTY);
    setUnits(product ? product.units.map((u) => ({ unit: u.unit, factor: Number(u.factor) })) : []);
    setSection("description");
    setError(null);
  }

  async function submit(keepOpen: boolean) {
    if (!form.name.trim()) {
      setError(d.nameRequired);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name.trim(),
        articleNumber: toNumber(form.articleNumber),
        category: form.category,
        unit: form.unit,
        taxRate: rate,
        // Only net is sent; the API owns the gross figure.
        sellingPriceNet: toNumber(form.sellingNet) ?? 0,
        purchasePriceNet: toNumber(form.purchaseNet),
        description: form.description.trim() || null,
        internalNote: form.internalNote.trim() || null,
        inventoryEnabled: form.inventoryEnabled,
        units: units.filter((row) => row.factor > 0),
      };

      const saved = product ? await updateProduct(product.id, body) : await createProduct(body);
      onCreated(saved);

      // Editing always closes: there is no "and next" for a record that already exists.
      if (keepOpen && !product) {
        reset();
      } else {
        reset();
        onClose();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : product
            ? d.saveError
            : d.createError,
      );
    } finally {
      setSaving(false);
    }
  }

  const sellingNetValue = toNumber(form.sellingNet) ?? 0;

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={editing ? d.titleEdit : d.titleNew}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={d.productName}
          required
          value={form.name}
          onChange={(v) => set("name", v)}
          placeholder={d.productNamePlaceholder}
        />
        <Select
          label={d.standardUnit}
          value={form.unit}
          onChange={(v) => set("unit", v as ProductUnitCode)}
          options={UNIT_ORDER}
          labels={t.units}
        />

        <Field
          label={d.artNo}
          value={form.articleNumber}
          onChange={(v) => set("articleNumber", v)}
          placeholder={nextNumber != null ? String(nextNumber) : d.assignedOnSave}
          hint={
            // An existing product already has its number; only a new one is waiting for one.
            editing
              ? d.renumberHint
              : nextNumber != null
                ? `Left blank, this product gets ${nextNumber}.`
                : d.autoAssignHint
          }
        />
        <Select
          label={d.vatPercent}
          value={form.taxRate}
          onChange={setTaxRate}
          options={TAX_RATES}
          labels={Object.fromEntries(TAX_RATES.map((r) => [r, `${r}%`]))}
        />

        <Select
          label={d.category}
          value={form.category}
          onChange={(v) => set("category", v as ProductCategory)}
          options={["article", "service"]}
          labels={{ article: d.categoryArticle, service: d.categoryService }}
        />
        <Field
          label={d.sellingNet}
          value={form.sellingNet}
          onChange={(v) => setPrice("selling", "net", v)}
          placeholder={d.pricePlaceholder}
          suffix="EUR"
        />

        <Field
          label={d.purchaseNet}
          value={form.purchaseNet}
          onChange={(v) => setPrice("purchase", "net", v)}
          placeholder={d.pricePlaceholder}
          suffix="EUR"
          hint={d.purchaseHint}
        />
        <Field
          label={d.sellingGross}
          value={form.sellingGross}
          onChange={(v) => setPrice("selling", "gross", v)}
          placeholder={d.pricePlaceholder}
          suffix="EUR"
        />

        <Field
          label={d.purchaseGross}
          value={form.purchaseGross}
          onChange={(v) => setPrice("purchase", "gross", v)}
          placeholder={d.pricePlaceholder}
          suffix="EUR"
        />
      </div>

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

      <div className="mt-5">
        {section === "description" ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextArea
              label={d.productDescription}
              value={form.description}
              onChange={(v) => set("description", v)}
              placeholder={d.productDescriptionPlaceholder}
            />
            <TextArea
              label={d.internalNote}
              value={form.internalNote}
              onChange={(v) => set("internalNote", v)}
              placeholder={d.internalNotePlaceholder}
              hint={d.internalNoteHint}
            />
          </div>
        ) : null}

        {section === "otherUnits" ? (
          <UnitTable
            units={units}
            baseUnit={form.unit}
            sellingNet={sellingNetValue}
            onChange={setUnits}
          />
        ) : null}

        {section === "moreSettings" ? (
          <div className="space-y-4">
            <Toggle
              label={d.inventoryActivated}
              hint={d.inventoryHint}
              checked={form.inventoryEnabled}
              onChange={(v) => set("inventoryEnabled", v)}
            />
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}

/**
 * Alternative units and what they work out to.
 *
 * <p>The price column is computed from the factor rather than typed, so repricing the product
 * cannot leave a stale pack price behind.
 */
function UnitTable({
  units,
  baseUnit,
  sellingNet,
  onChange,
}: {
  units: ProductUnitInput[];
  baseUnit: ProductUnitCode;
  sellingNet: number;
  onChange: (units: ProductUnitInput[]) => void;
}) {
  const t = useT();
  const d = t.productDialog;

  function update(index: number, patch: Partial<ProductUnitInput>) {
    onChange(units.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        <span>{d.unitColumn}</span>
        <span>{d.factorColumn}</span>
        <span>{d.priceNetColumn}</span>
        <span className="w-10" />
      </div>

      <div className="space-y-2">
        {units.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted">
            {format(d.unitsEmpty, {
              unit: t.units[baseUnit],
              price: sellingNet.toFixed(2),
            })}
          </p>
        ) : null}

        {units.map((row, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] items-center gap-2">
            <select
              value={row.unit}
              aria-label={format(d.unitAria, { n: index + 1 })}
              onChange={(event) => update(index, { unit: event.target.value as ProductUnitCode })}
              className="h-10 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
            >
              {UNIT_ORDER.map((code) => (
                <option key={code} value={code}>
                  {t.units[code]}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              step="0.0001"
              value={row.factor}
              aria-label={format(d.factorAria, { n: index + 1 })}
              onChange={(event) => update(index, { factor: Number(event.target.value) })}
              className="h-10 rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {/* Read-only: it is derived, and an editable box would invite it to be contradicted. */}
            <span className="text-sm tabular-nums text-muted">
              {(sellingNet * (row.factor || 0)).toFixed(2)} EUR
            </span>
            <button
              type="button"
              onClick={() => onChange(units.filter((_, i) => i !== index))}
              aria-label={format(d.removeUnitAria, { n: index + 1 })}
              className="grid size-10 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 hover:text-red-600"
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
        onClick={() => onChange([...units, { unit: baseUnit, factor: 1 }])}
        className="mt-3 text-sm font-medium text-primary hover:underline"
      >
        {d.addUnit}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  required?: boolean;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </span>
      <div className="relative">
        <input
          value={value}
          required={required}
          placeholder={placeholder}
          inputMode={suffix ? "decimal" : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            suffix && "pr-12 text-right tabular-nums",
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
            {labels?.[option] || option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
      {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
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
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </span>
    </div>
  );
}
