package com.myvision.api.service;

import com.myvision.api.dto.VatReportResponse;
import com.myvision.api.entity.Invoice;
import com.myvision.api.entity.InvoiceStatus;
import com.myvision.api.entity.InvoiceItem;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.repository.CompanyRepository;
import com.myvision.api.repository.InvoiceItemRepository;
import com.myvision.api.repository.InvoiceRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Aggregates VAT invoiced over a period.
 *
 * <p>Answers the question a German advance return asks — how much output tax was invoiced, split
 * by rate — from the invoices the system actually holds. It computes; it does not advise.
 */
@Service
public class VatReportService {

  /**
   * Invoices that count as issued supply. Draft has not been issued and cancelled has been
   * withdrawn, so neither belongs in a return.
   */
  private static final Set<InvoiceStatus> REPORTABLE = EnumSet.of(
      InvoiceStatus.sent,
      InvoiceStatus.unpaid,
      InvoiceStatus.partially_paid,
      InvoiceStatus.overdue,
      InvoiceStatus.paid);

  private final CompanyAccessService companyAccessService;
  private final CompanyRepository companyRepository;
  private final InvoiceRepository invoiceRepository;
  private final InvoiceItemRepository invoiceItemRepository;

  public VatReportService(
      CompanyAccessService companyAccessService,
      CompanyRepository companyRepository,
      InvoiceRepository invoiceRepository,
      InvoiceItemRepository invoiceItemRepository
  ) {
    this.companyAccessService = companyAccessService;
    this.companyRepository = companyRepository;
    this.invoiceRepository = invoiceRepository;
    this.invoiceItemRepository = invoiceItemRepository;
  }

  @Transactional(readOnly = true)
  public VatReportResponse report(UUID userId, LocalDate from, LocalDate to) {
    if (from == null || to == null) {
      throw new BadRequestException("from and to dates are required");
    }
    if (to.isBefore(from)) {
      throw new BadRequestException("to date must not be before from date");
    }

    UUID companyId = companyAccessService.currentCompanyId(userId);
    String currency = companyRepository.findById(companyId)
        .map(company -> company.getDefaultCurrency())
        .orElse("EUR");

    // Issue date, not payment date: German VAT on the standard scheme is owed when the invoice is
    // issued, not when the customer eventually pays.
    List<Invoice> invoices = invoiceRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
        .stream()
        .filter(invoice -> REPORTABLE.contains(invoice.getStatus()))
        .filter(invoice -> withinPeriod(invoice.getIssueDate(), from, to))
        .toList();

    BigDecimal net = BigDecimal.ZERO;
    BigDecimal vat = BigDecimal.ZERO;
    BigDecimal gross = BigDecimal.ZERO;
    for (Invoice invoice : invoices) {
      net = net.add(nullSafe(invoice.getSubtotalAmount()).subtract(nullSafe(invoice.getDiscountAmount())));
      vat = vat.add(nullSafe(invoice.getTaxAmount()));
      gross = gross.add(nullSafe(invoice.getTotalAmount()));
    }

    return new VatReportResponse(
        from,
        to,
        currency,
        scale(net),
        scale(vat),
        scale(gross),
        invoices.size(),
        breakdownByRate(invoices));
  }

  /**
   * Splits net and tax per VAT rate.
   *
   * <p>A return reports each rate separately, so a single blended total would not be usable. Line
   * tax is derived from the line's own rate rather than apportioning the invoice total, which
   * keeps mixed-rate invoices correct.
   */
  private List<VatReportResponse.VatRateLine> breakdownByRate(List<Invoice> invoices) {
    if (invoices.isEmpty()) {
      return List.of();
    }
    List<UUID> ids = invoices.stream().map(Invoice::getId).toList();
    List<InvoiceItem> items = invoiceItemRepository.findByInvoiceIdIn(ids);

    Map<BigDecimal, BigDecimal[]> byRate = new TreeMap<>(Comparator.naturalOrder());
    for (InvoiceItem item : items) {
      BigDecimal rate = nullSafe(item.getTaxRate()).stripTrailingZeros();
      BigDecimal lineNet = nullSafe(item.getLineTotal());
      BigDecimal lineVat = lineNet
          .multiply(nullSafe(item.getTaxRate()))
          .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

      BigDecimal[] totals = byRate.computeIfAbsent(rate, ignored -> new BigDecimal[] {
          BigDecimal.ZERO, BigDecimal.ZERO });
      totals[0] = totals[0].add(lineNet);
      totals[1] = totals[1].add(lineVat);
    }

    return byRate.entrySet().stream()
        .map(entry -> new VatReportResponse.VatRateLine(
            entry.getKey(),
            scale(entry.getValue()[0]),
            scale(entry.getValue()[1])))
        .toList();
  }

  private static boolean withinPeriod(LocalDate issueDate, LocalDate from, LocalDate to) {
    return issueDate != null && !issueDate.isBefore(from) && !issueDate.isAfter(to);
  }

  private static BigDecimal nullSafe(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }

  private static BigDecimal scale(BigDecimal value) {
    return value.setScale(2, RoundingMode.HALF_UP);
  }
}
