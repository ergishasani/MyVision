"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { archiveProduct, deleteProduct, listProducts } from "@/lib/api/products";
import type { Product } from "@/types/api";
import { ProductDialog } from "@/components/products/product-dialog";
import { UNIT_LABELS } from "@/lib/utils/product-units";
import { formatMoney } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const TABS = ["All", "Article", "Service"] as const;
type Tab = (typeof TABS)[number];

const PAGE_SIZES = [25, 50, 100];

function matchesTab(product: Product, tab: Tab) {
  if (tab === "All") return true;
  return tab === "Article" ? product.category === "article" : product.category === "service";
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("All");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  // The open menu, with the anchor it hangs from. Held here because the menu renders in a portal.
  const [menu, setMenu] = useState<{ id: string; top: number; right: number } | null>(null);
  const [confirmArchive, setConfirmArchive] = useState<Product | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  // Derived from the list rather than copied into state, so a saved product does not leave the
  // dialog showing the values it opened with.
  const editing = products.find((p) => p.id === editingId) ?? null;

  useEffect(() => {
    listProducts()
      .then(setProducts)
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : "Failed to load products"),
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((product) => matchesTab(product, tab))
      .filter((product) =>
        !q
          ? true
          : [product.name, product.description, String(product.articleNumber ?? "")]
              .filter(Boolean)
              .some((field) => field!.toLowerCase().includes(q)),
      );
  }, [products, tab, query]);

  const counts = useMemo(() => {
    const result = {} as Record<Tab, number>;
    for (const label of TABS) {
      result[label] = products.filter((product) => matchesTab(product, label)).length;
    }
    return result;
  }, [products]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const visible = filtered.slice((current - 1) * pageSize, current * pageSize);
  const firstRow = filtered.length === 0 ? 0 : (current - 1) * pageSize + 1;
  const lastRow = Math.min(current * pageSize, filtered.length);

  async function handleArchive(product: Product) {
    setConfirmArchive(null);
    setMenu(null);
    // Optimistic: the row disappears at once and comes back if the API refuses.
    const previous = products;
    setProducts((list) => list.filter((p) => p.id !== product.id));
    try {
      await archiveProduct(product.id);
    } catch (err) {
      setProducts(previous);
      setError(err instanceof ApiError ? err.message : "Could not archive the product");
    }
  }

  async function handleDelete(product: Product) {
    setConfirmDelete(null);
    setMenu(null);
    const previous = products;
    setProducts((list) => list.filter((p) => p.id !== product.id));
    try {
      await deleteProduct(product.id);
    } catch (err) {
      setProducts(previous);
      setError(err instanceof ApiError ? err.message : "Could not delete the product");
    }
  }

  return (
    <div className="space-y-6" onClick={() => setMenu(null)}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Products</h1>
          {!loading ? (
            <p className="mt-1 text-sm font-medium text-foreground">
              {products.length} product{products.length === 1 ? "" : "s"}
            </p>
          ) : null}
          <p className="mt-1 text-sm text-muted">
            Reusable priced lines, so a quote does not mean retyping the same item.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-blue-700"
          >
            <PlusIcon className="size-4" />
            Create product
          </button>
        </div>
      </header>

      {error ? (
        <div className="flex items-start justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <div>
            <p className="text-sm font-medium text-red-700">Something went wrong</p>
            <p className="mt-1 text-sm text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-sm font-medium text-red-700 hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex flex-wrap items-center gap-1">
            {TABS.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setTab(name);
                  setPage(1);
                }}
                aria-pressed={tab === name}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  tab === name
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted hover:bg-slate-100 hover:text-foreground",
                )}
              >
                {name}
                <span className="ml-1.5 text-xs opacity-70">{counts[name]}</span>
              </button>
            ))}
          </div>

          <label className="relative">
            <span className="sr-only">Search products</span>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search name or number…"
              className="h-9 w-64 rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/70">
                <th scope="col" className="w-24 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">No.</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Name</th>
                <th scope="col" className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Category</th>
                <th scope="col" className="w-28 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted">Unit</th>
                <th scope="col" className="w-20 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">VAT</th>
                <th scope="col" className="w-40 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">Price (net)</th>
                <th scope="col" className="w-28 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16">
                    <div className="mx-auto max-w-sm text-center">
                      <div className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100">
                        <BoxIcon className="size-5 text-muted" />
                      </div>
                      <p className="mt-3 text-sm font-medium text-foreground">
                        {loading
                          ? "Loading products…"
                          : products.length === 0
                            ? "No products yet"
                            : "Nothing matches those filters"}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {loading
                          ? "Fetching from the API."
                          : products.length === 0
                            ? "Add the items and services you sell, and they become one click on a quote."
                            : "Try a different tab or clear the search."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                visible.map((product) => (
                  <tr key={product.id} className="border-b border-border last:border-0 hover:bg-slate-50/70">
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {product.articleNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{product.name}</span>
                      {product.description ? (
                        <span className="block truncate text-xs text-muted">{product.description}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          product.category === "service"
                            ? "bg-violet-50 text-violet-700"
                            : "bg-slate-100 text-slate-700",
                        )}
                      >
                        {product.category === "service" ? "Service" : "Article"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">{UNIT_LABELS[product.unit]}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">
                      {Number(product.taxRate)}%
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className="font-medium text-foreground">
                        {formatMoney(product.sellingPriceNet)}
                      </span>
                      {/* Gross alongside net, because the two are what people cross-check. */}
                      <span className="block text-xs text-muted">
                        {formatMoney(product.sellingPriceGross)} gross
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {/* Always visible rather than hover-only: hover-only controls are
                          unreachable by keyboard and on touch. */}
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${product.name}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setMenu(null);
                            setEditingId(product.id);
                          }}
                          className="rounded-md p-1.5 text-muted transition-colors hover:bg-slate-200 hover:text-foreground"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Options for ${product.name}`}
                          aria-expanded={menu?.id === product.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (menu?.id === product.id) {
                              setMenu(null);
                              return;
                            }
                            // Positioned from the button's own box because the menu renders in a
                            // portal on document.body, outside this scrolling table.
                            const box = event.currentTarget.getBoundingClientRect();
                            setMenu({
                              id: product.id,
                              top: box.bottom + 6,
                              right: window.innerWidth - box.right,
                            });
                          }}
                          className="rounded-md p-1.5 text-muted transition-colors hover:bg-slate-200 hover:text-foreground"
                        >
                          <DotsIcon className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              aria-label="Rows per page"
              className="h-8 rounded-lg border border-border bg-card px-2 text-sm outline-none focus:border-primary"
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted">
              {filtered.length === 0
                ? "No entries"
                : `Showing ${firstRow} – ${lastRow} of ${filtered.length} entries`}
            </p>
          </div>

          <div className="flex items-center gap-1">
            <PageBtn label="First" disabled={current === 1} onClick={() => setPage(1)}>«</PageBtn>
            <PageBtn label="Previous" disabled={current === 1} onClick={() => setPage(current - 1)}>‹</PageBtn>
            <span className="px-2 text-sm text-muted">
              {current} / {pageCount}
            </span>
            <PageBtn label="Next" disabled={current === pageCount} onClick={() => setPage(current + 1)}>›</PageBtn>
            <PageBtn label="Last" disabled={current === pageCount} onClick={() => setPage(pageCount)}>»</PageBtn>
          </div>
        </div>
      </section>

      {/* Rendered on document.body so the horizontally scrolling table cannot clip it. */}
      {menu
        ? createPortal(
            (() => {
              const product = products.find((p) => p.id === menu.id);
              if (!product) return null;
              return (
                <div
                  role="menu"
                  onClick={(event) => event.stopPropagation()}
                  style={{ top: menu.top, right: menu.right }}
                  className="fixed z-50 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 text-left shadow-lg"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(null);
                      setEditingId(product.id);
                    }}
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-slate-50"
                  >
                    Edit product
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmArchive(product)}
                    className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-slate-50"
                  >
                    Archive product
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(product)}
                    className="mt-1 block w-full border-t border-border px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete product
                  </button>
                </div>
              );
            })(),
            document.body,
          )
        : null}

      <ProductDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreated={(product) => setProducts((list) => [product, ...list])}
      />

      <ProductDialog
        // Keyed on the product so opening a different one remounts the form with its values.
        key={editing?.id ?? "none"}
        open={editing !== null}
        product={editing}
        onClose={() => setEditingId(null)}
        onCreated={(saved) => {
          setProducts((list) => list.map((p) => (p.id === saved.id ? saved : p)));
          setEditingId(null);
        }}
      />

      {confirmArchive ? (
        <ConfirmDialog
          title="Archive this product?"
          confirmLabel="Archive"
          tone="neutral"
          onCancel={() => setConfirmArchive(null)}
          onConfirm={() => handleArchive(confirmArchive)}
        >
          <span className="font-medium text-foreground">{confirmArchive.name}</span> is hidden from
          the catalogue but kept, so you can still see what it was. Use this for something you have
          stopped selling.
        </ConfirmDialog>
      ) : null}

      {confirmDelete ? (
        <ConfirmDialog
          title="Delete this product?"
          confirmLabel="Delete permanently"
          tone="danger"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        >
          <span className="font-medium text-foreground">{confirmDelete.name}</span> and its
          alternative units are removed for good. This cannot be undone.
          {/* Worth saying, because the equivalent warning on a contact is the opposite. */}
          <span className="mt-3 block">
            Quotes and invoices are unaffected — a line keeps the description and price it was
            written with rather than pointing at this entry.
          </span>
        </ConfirmDialog>
      ) : null}

    </div>
  );
}

/** Confirmation for an action that cannot simply be undone by clicking again. */
function ConfirmDialog({
  title,
  children,
  confirmLabel,
  tone,
  onCancel,
  onConfirm,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  tone: "neutral" | "danger";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Cancel"
        onClick={onCancel}
        className="fixed inset-0 cursor-default bg-slate-900/40"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted">{children}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 rounded-lg px-4 text-sm font-medium text-foreground hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "h-10 rounded-lg px-4 text-sm font-medium text-white",
              tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-slate-800 hover:bg-slate-900",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PageBtn({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg border border-border text-muted transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/* --- icons --- */
type IconProps = { className?: string };
function icon(path: React.ReactNode) {
  return function Icon({ className }: IconProps) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
        {path}
      </svg>
    );
  };
}
const PlusIcon = icon(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
const SearchIcon = icon(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>);
const PencilIcon = icon(<><path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5Z" /><path d="m13.5 6.5 4 4" /></>);
const DotsIcon = icon(<><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></>);
const BoxIcon = icon(<><path d="M21 8 12 3 3 8v8l9 5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></>);
