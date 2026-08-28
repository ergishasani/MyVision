package com.myvision.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * VAT actually invoiced over a period, computed from issued invoices.
 *
 * <p>Drafts and cancelled invoices are excluded: neither represents a supply that has been
 * invoiced, so neither belongs in a return.
 *
 * <p>This is an engineering aggregate, not tax advice. It reports what the system recorded; the
 * figures still need review against
 * {@code docs/invoice-compliance-checklist.md} before they go near a filing.
 */
public record VatReportResponse(
    LocalDate from,
    LocalDate to,
    String currency,
    BigDecimal netAmount,
    BigDecimal vatAmount,
    BigDecimal grossAmount,
    int invoiceCount,
    List<VatRateLine> byRate
) {

  /** Net and tax totals for one VAT rate, which is how a return is broken down. */
  public record VatRateLine(BigDecimal rate, BigDecimal netAmount, BigDecimal vatAmount) {
  }
}
