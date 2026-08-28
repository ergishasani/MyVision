import type { ProductUnitCode } from "@/types/api";

/**
 * How each unit is written on screen.
 *
 * <p>Shared between the catalogue list and the create form so a product is not labelled one way
 * in the table and another in the dialog.
 */
export const UNIT_LABELS: Record<ProductUnitCode, string> = {
  pcs: "Pcs",
  lump_sum: "Lump sum",
  hour: "Hour",
  percent: "%",
  day: "Day(s)",
  sqm: "m²",
  meter: "m",
  kg: "kg",
  tonne: "t",
  linear_meter: "Linear meter",
  cbm: "m³",
  km: "km",
  litre: "L",
};

/** Dropdown order: the units a construction or service business reaches for first. */
export const UNIT_ORDER: ProductUnitCode[] = [
  "pcs",
  "lump_sum",
  "hour",
  "percent",
  "day",
  "sqm",
  "meter",
  "kg",
  "tonne",
  "linear_meter",
  "cbm",
  "km",
  "litre",
];
