import { apiFetch } from "@/lib/api/client";
import type { Product, ProductCategory, ProductUnitCode } from "@/types/api";

export type ProductUnitInput = {
  unit: ProductUnitCode;
  factor: number;
};

/**
 * A product being created or edited.
 *
 * <p>Only the net prices are sent. The API stores net and derives gross, so sending a gross
 * figure alongside it would just be a second copy of the same number waiting to disagree.
 */
export type ProductInput = {
  name: string;
  articleNumber?: number | null;
  category?: ProductCategory;
  unit?: ProductUnitCode;
  taxRate?: number;
  sellingPriceNet?: number;
  purchasePriceNet?: number | null;
  description?: string | null;
  internalNote?: string | null;
  inventoryEnabled?: boolean;
  units?: ProductUnitInput[];
};

export async function listProducts() {
  return apiFetch<Product[]>("/products");
}

export async function createProduct(input: ProductInput) {
  return apiFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateProduct(id: string, patch: Partial<ProductInput>) {
  return apiFetch<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/** Soft delete: the backend sets archivedAt rather than removing the row. */
export async function deleteProduct(id: string) {
  return apiFetch<void>(`/products/${id}`, { method: "DELETE" });
}

/** The number the next product would get, for pre-filling the create form. */
export async function peekNextArticleNumber() {
  const body = await apiFetch<{ nextArticleNumber: number }>("/products/next-number");
  return body.nextArticleNumber;
}
