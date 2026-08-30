import type { ProductUnitCode } from "@/types/api";

// Unit *labels* moved into the i18n dictionary (`t.units`) so they follow the interface
// language. Only the ordering lives here, which is language-independent.

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
