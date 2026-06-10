package com.myvision.api.invoice;

/**
 * Uppercase constants (unlike the other enums) because the database label
 * 'final' is a reserved Java keyword. Mapping to the lowercase PostgreSQL
 * labels is handled by {@link com.myvision.api.common.LowercaseLabelEnumJdbcType}.
 */
public enum InvoiceType {
  STANDARD,
  DEPOSIT,
  PROGRESS,
  FINAL,
  CREDIT_NOTE
}
