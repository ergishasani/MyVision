package com.myvision.api.service;

import com.myvision.api.dto.VatReportResponse;
import com.myvision.api.dto.VatReturnResponse;
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
   * The same period, arranged as the advance-return form.
   *
   * <p>Built on top of {@link #report}, so the figures on the form are by construction the same
   * ones the plain VAT report shows — there is one computation, not two that could disagree.
   *
   * <p>Every box of the form is present, because an operator checking a return needs to see the
   * lines that are nil as well as the ones that are not. Only the taxable-sales block is actually
   * derived: Kz 81 for the standard rate, Kz 86 for the reduced rate and Kz 35/36 for anything
   * else. Everything below it — tax-free supplies, intra-community acquisitions, reverse charge
   * under Sec. 13b, and above all the deductible input tax at Kz 66 — has no source in a system
   * that records sales and not purchases. Those blocks come back marked underived with null
   * amounts, and the Zahllast comes back null with them.
   *
   * <p>Statutory line text is German and verbatim; it cites the law the box refers to.
   */
  @Transactional(readOnly = true)
  public VatReturnResponse vatReturn(UUID userId, LocalDate from, LocalDate to) {
    VatReportResponse report = report(userId, from, to);

    BigDecimal standardBasis = BigDecimal.ZERO;
    BigDecimal standardTax = BigDecimal.ZERO;
    BigDecimal reducedBasis = BigDecimal.ZERO;
    BigDecimal reducedTax = BigDecimal.ZERO;
    BigDecimal otherBasis = BigDecimal.ZERO;
    BigDecimal otherTax = BigDecimal.ZERO;

    for (VatReportResponse.VatRateLine line : report.byRate()) {
      int rate = line.rate() == null ? 0 : line.rate().intValue();
      if (rate == 19) {
        standardBasis = standardBasis.add(line.netAmount());
        standardTax = standardTax.add(line.vatAmount());
      } else if (rate == 7) {
        reducedBasis = reducedBasis.add(line.netAmount());
        reducedTax = reducedTax.add(line.vatAmount());
      } else {
        // Zero-rated and any non-standard rate. Grouped rather than guessed at: a 0% line could
        // be an export, a reverse charge or an exempt supply, and this system does not record
        // which, so it cannot be routed to the form's own tax-free boxes.
        otherBasis = otherBasis.add(line.netAmount());
        otherTax = otherTax.add(line.vatAmount());
      }
    }

    List<VatReturnResponse.Group> groups = List.of(
        derivedGroup("Taxable sales", List.of(
            derived("81", null,
                "Steuerpflichtige Ums\u00e4tze zum Steuersatz von 19%",
                standardBasis, standardTax),
            derived("86", null,
                "Steuerpflichtige Ums\u00e4tze zum Steuersatz von 7%",
                reducedBasis, reducedTax),
            derived("35", "36",
                "Steuerpflichtige Ums\u00e4tze zu anderen Steuers\u00e4tzen",
                otherBasis, otherTax),
            untracked("77", null,
                "Lieferungen land- und forstwirtschaftlicher Betriebe nach \u00a7 24 UStG an "
                    + "Abnehmer mit USt-IdNr."),
            untracked("76", "80",
                "Ums\u00e4tze, f\u00fcr die eine Steuer nach \u00a7 24 UStG zu entrichten ist"))),

        untrackedGroup("Tax-free sales with input tax deduction", List.of(
            untracked("41", null,
                "Innergemeinschaftliche Lieferungen (\u00a7 4 Nr. 1 Buchst. b UStG) an Abnehmer "
                    + "mit USt-IdNr."),
            untracked("44", null,
                "Innergemeinschaftliche Lieferungen (\u00a7 4 Nr. 1 Buchst. b UStG) neuer "
                    + "Fahrzeuge an Abnehmer ohne USt-IdNr."),
            untracked("49", null,
                "Innergemeinschaftliche Lieferungen (\u00a7 4 Nr. 1 Buchst. b UStG) neuer "
                    + "Fahrzeuge au\u00dferhalb eines Unternehmens (\u00a7 2a UStG)"),
            untracked("43", null,
                "Weitere steuerfreie Ums\u00e4tze mit Vorsteuerabzug z.B. Ausfuhrlieferungen"))),

        untrackedGroup("Tax-free sales without input tax deduction", List.of(
            untracked("48", null, "Steuerfreie Ums\u00e4tze ohne Vorsteuerabzug"))),

        untrackedGroup("Intra-community acquisitions", List.of(
            untracked("91", null,
                "Steuerfreie innergemeinschaftliche Erwerbe von bestimmten Gegenst\u00e4nden und "
                    + "Anlagegold (\u00a7\u00a7 4b und 25c UStG)"),
            untracked("89", null,
                "Steuerpflichtige innergemeinschaftliche Erwerbe zum Steuersatz von 19%"),
            untracked("93", null,
                "Steuerpflichtige innergemeinschaftliche Erwerbe zum Steuersatz von 7%"),
            untracked("95", "98",
                "Steuerpflichtige innergemeinschaftliche Erwerbe zu anderen Steuers\u00e4tzen"),
            untracked("94", "96",
                "Innergemeinschaftliche Erwerbe neuer Fahrzeuge (\u00a7 1b Absatz 2 und 3 UStG) "
                    + "von Lieferern ohne Umsatzsteuer-Identifikationsnummer zum allgemeinen "
                    + "Steuersatz"))),

        untrackedGroup("Recipient of services as debtor of tax (Sec. 13b UStG)", List.of(
            untracked("46", "47",
                "Sonstige Leistungen nach \u00a7 3a Abs. 2 UStG eines im \u00fcbrigen "
                    + "Gemeinschaftsgebiet ans\u00e4ssigen Unternehmens (\u00a7 13b Abs. 1 UStG)"),
            untracked("73", "74",
                "Ums\u00e4tze, die unter das GrEStG fallen (\u00a7 13b Abs. 2 Nr. 3 UStG)"),
            untracked("84", "85",
                "Andere Leistungen (\u00a7 13b Abs. 2 Nr. 1, 2, 4 bis 11 UStG)"))),

        untrackedGroup("Additional information on sales", List.of(
            untracked("42", null,
                "Lieferungen des ersten Abnehmers bei innergemeinschaftlichen "
                    + "Dreiecksgesch\u00e4ften (\u00a7 25b UStG)"),
            untracked("60", null,
                "Steuerpflichtige Ums\u00e4tze des leistenden Unternehmers, f\u00fcr die der "
                    + "Leistungsempf\u00e4nger die Steuer nach \u00a7 13b Abs. 5 UStG schuldet"),
            untracked("21", null,
                "Nicht steuerbare sonstige Leistungen gem. \u00a7 18b Satz 1 Nr. 2 UStG"),
            untracked("45", null,
                "\u00dcbrige nicht steuerbare Ums\u00e4tze (Leistungsort nicht im Inland)"))),

        untrackedGroup("Deductible input tax amounts", List.of(
            untracked(null, "66",
                "Vorsteuerbetr\u00e4ge aus Rechnungen von anderen Unternehmen, aus Leistungen im "
                    + "Sinne des \u00a7 13a Abs. 1 Nr. 6 UStG und aus innergemeinschaftlichen "
                    + "Dreiecksgesch\u00e4ften"),
            untracked(null, "61",
                "Vorsteuerbetr\u00e4ge aus dem innergemeinschaftlichen Erwerb von "
                    + "Gegenst\u00e4nden (\u00a7 15 Abs. 1 Satz 1 Nr. 3 UStG)"),
            untracked(null, "62",
                "Entstandene Einfuhrumsatzsteuer (\u00a7 15 Abs. 1 Satz 1 Nr. 2 UStG)"),
            untracked(null, "67",
                "Vorsteuerbetr\u00e4ge aus Leistungen im Sinne des \u00a7 13b UStG"),
            untracked(null, "63",
                "Vorsteuerbetr\u00e4ge, die nach allgemeinen Durchschnittss\u00e4tzen berechnet "
                    + "sind (\u00a7\u00a7 23 und 23a UStG)"),
            untracked(null, "59",
                "Vorsteuerabzug f\u00fcr innergemeinschaftliche Lieferungen neuer Fahrzeuge "
                    + "au\u00dferhalb eines Unternehmens sowie von Kleinunternehmern im Sinne des "
                    + "\u00a7 19 Abs. 1 UStG"),
            untracked(null, "64", "Berichtigung des Vorsteuerabzugs (\u00a7 15a UStG)"))),

        untrackedGroup("Other tax amounts", List.of(
            untracked(null, "65",
                "Steuer infolge Wechsels der Besteuerungsform sowie Nachsteuer auf versteuerte "
                    + "Anzahlungen u. \u00e4. wegen Steuersatz\u00e4nderung"),
            untracked(null, "69",
                "In Rechnungen unrichtig oder unberechtigt ausgewiesene Steuerbetr\u00e4ge "
                    + "(\u00a7 14c UStG) sowie Steuerbetr\u00e4ge, die nach \u00a7 6a Abs. 4 "
                    + "Satz 2, \u00a7 17 Abs. 1 Satz 6, \u00a7 25b Abs. 2 UStG oder von einem "
                    + "Auslagerer oder Lagerhalter nach \u00a7 13a Abs. 1 Nr. 6 UStG geschuldet "
                    + "werden"),
            untracked(null, "39",
                "Abzug der festgesetzten Sondervorauszahlung f\u00fcr "
                    + "Dauerfristverl\u00e4ngerung"))));

    BigDecimal outputTax = scale(standardTax.add(reducedTax).add(otherTax));

    return new VatReturnResponse(
        from,
        to,
        report.currency(),
        groups,
        outputTax,
        // No purchases in this system, so no input tax and therefore no Zahllast.
        false,
        null,
        report.invoiceCount());
  }

  /** A line this system computed. */
  private VatReturnResponse.Line derived(
      String basisCode, String taxCode, String label, BigDecimal basis, BigDecimal tax) {
    return new VatReturnResponse.Line(basisCode, taxCode, label, scale(basis), scale(tax), true);
  }

  /**
   * A line of the form this system has no source for.
   *
   * <p>Amounts are null, not nought. Nought asserts that the box was checked and found empty,
   * which for a business with EU purchases would be a false statement on a tax form.
   */
  private static VatReturnResponse.Line untracked(
      String basisCode, String taxCode, String label) {
    return new VatReturnResponse.Line(basisCode, taxCode, label, null, null, false);
  }

  /** A block whose totals are the sum of the lines under it. */
  private VatReturnResponse.Group derivedGroup(
      String label, List<VatReturnResponse.Line> lines) {
    BigDecimal basis = BigDecimal.ZERO;
    BigDecimal tax = BigDecimal.ZERO;
    for (VatReturnResponse.Line line : lines) {
      if (line.basis() != null) {
        basis = basis.add(line.basis());
      }
      if (line.tax() != null) {
        tax = tax.add(line.tax());
      }
    }
    return new VatReturnResponse.Group(label, true, scale(basis), scale(tax), lines);
  }

  private static VatReturnResponse.Group untrackedGroup(
      String label, List<VatReturnResponse.Line> lines) {
    return new VatReturnResponse.Group(label, false, null, null, lines);
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
