package com.myvision.api.entity;

/**
 * The units a product can be sold in.
 *
 * <p>Named {@code ProductUnitCode} rather than {@code ProductUnit} because {@link ProductUnit} is
 * the entity for a product's alternative units, and having both would be a confusing pair.
 */
public enum ProductUnitCode {
  pcs,
  lump_sum,
  hour,
  percent,
  day,
  sqm,
  meter,
  kg,
  tonne,
  linear_meter,
  cbm,
  km,
  litre
}
