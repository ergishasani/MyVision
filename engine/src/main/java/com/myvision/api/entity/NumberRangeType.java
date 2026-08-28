package com.myvision.api.entity;

/** The counters a company keeps. One row in {@code number_ranges} per value. */
public enum NumberRangeType {
  invoice,
  quote,
  credit_note,
  order_confirmation,
  delivery_note,
  contact,
  product,
  debtor,
  creditor
}
