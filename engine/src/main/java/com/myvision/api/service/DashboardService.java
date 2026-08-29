package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.repository.ClientRepository;
import com.myvision.api.dto.ClientResponse;
import com.myvision.api.service.CompanyAccessService;
import com.myvision.api.repository.InvoiceItemRepository;
import com.myvision.api.repository.InvoiceRepository;
import com.myvision.api.dto.InvoiceResponse;
import com.myvision.api.entity.InvoiceStatus;
import com.myvision.api.repository.PaymentRepository;
import com.myvision.api.repository.ProjectRepository;
import com.myvision.api.entity.ProjectStatus;
import com.myvision.api.repository.QuoteRepository;
import com.myvision.api.entity.QuoteStatus;
import com.myvision.api.repository.AuditLogRepository;
import com.myvision.api.repository.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

  private static final List<InvoiceStatus> INVOICED_STATUSES = List.of(
      InvoiceStatus.sent, InvoiceStatus.unpaid, InvoiceStatus.partially_paid,
      InvoiceStatus.paid, InvoiceStatus.overdue);

  private static final List<InvoiceStatus> OUTSTANDING_STATUSES = List.of(
      InvoiceStatus.sent, InvoiceStatus.unpaid, InvoiceStatus.partially_paid,
      InvoiceStatus.overdue);

  private final InvoiceRepository invoiceRepository;
  private final InvoiceItemRepository invoiceItemRepository;
  private final PaymentRepository paymentRepository;
  private final ProjectRepository projectRepository;
  private final QuoteRepository quoteRepository;
  private final ClientRepository clientRepository;
  private final CompanyAccessService companyAccessService;
  private final CompanyRepository companyRepository;
  private final AuditLogRepository auditLogRepository;
  private final UserRepository userRepository;

  /** Months on the revenue chart when the caller does not say. */
  private static final int DEFAULT_REVENUE_MONTHS = 12;

  /** Window for the customer and line-description rankings when the caller does not say. */
  private static final int DEFAULT_BREAKDOWN_MONTHS = 3;

  /** "Aug 25" — short enough to fit twelve of them on one axis. */
  private static final DateTimeFormatter MONTH_LABEL =
      DateTimeFormatter.ofPattern("MMM yy", Locale.ENGLISH);

  public DashboardService(
      InvoiceRepository invoiceRepository,
      InvoiceItemRepository invoiceItemRepository,
      PaymentRepository paymentRepository,
      ProjectRepository projectRepository,
      QuoteRepository quoteRepository,
      ClientRepository clientRepository,
      CompanyAccessService companyAccessService,
      CompanyRepository companyRepository,
      AuditLogRepository auditLogRepository,
      UserRepository userRepository
  ) {
    this.invoiceRepository = invoiceRepository;
    this.invoiceItemRepository = invoiceItemRepository;
    this.paymentRepository = paymentRepository;
    this.projectRepository = projectRepository;
    this.quoteRepository = quoteRepository;
    this.clientRepository = clientRepository;
    this.companyAccessService = companyAccessService;
    this.companyRepository = companyRepository;
    this.auditLogRepository = auditLogRepository;
    this.userRepository = userRepository;
  }

  @Transactional(readOnly = true)
  public DashboardSummaryResponse summary(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);

    LocalDate today = LocalDate.now();
    LocalDate monthStart = today.withDayOfMonth(1);
    LocalDate monthEnd = today.withDayOfMonth(today.lengthOfMonth());
    OffsetDateTime monthStartTs = monthStart.atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime nextMonthTs = monthStart.plusMonths(1).atStartOfDay().atOffset(ZoneOffset.UTC);

    List<InvoiceResponse> recentInvoices = invoiceRepository
        .findTop5ByCompanyIdOrderByCreatedAtDesc(companyId)
        .stream()
        .map(invoice -> InvoiceResponse.from(
            invoice, invoiceItemRepository.findByInvoiceIdOrderByPositionAsc(invoice.getId())))
        .toList();

    List<ClientResponse> recentClients = clientRepository
        .findTop5ByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(companyId)
        .stream()
        .map(ClientResponse::from)
        .toList();

    return new DashboardSummaryResponse(
        invoiceRepository.sumInvoicedBetween(companyId, INVOICED_STATUSES, monthStart, monthEnd),
        paymentRepository.sumPaidBetween(companyId, monthStartTs, nextMonthTs),
        invoiceRepository.sumOutstanding(companyId, OUTSTANDING_STATUSES),
        invoiceRepository.sumOverdue(companyId, OUTSTANDING_STATUSES, today),
        invoiceRepository.countOverdue(companyId, OUTSTANDING_STATUSES, today),
        projectRepository.countByCompanyIdAndStatus(companyId, ProjectStatus.active),
        quoteRepository.countByCompanyIdAndStatusIn(
            companyId, List.of(QuoteStatus.draft, QuoteStatus.sent)),
        recentInvoices,
        recentClients
    );
  }

  /**
   * Everything the overview screen renders.
   *
   * <p>Aggregated in Java over the company's own rows rather than in SQL. The volumes here are a
   * small business's invoices, and keeping the bucketing in one readable place matters more than
   * shaving a query — the definitions have to stay legible, because they are what the operator
   * reads as "what I am owed".
   */
  @Transactional(readOnly = true)
  public DashboardOverviewResponse overview(UUID userId, Integer revenueMonths,
      Integer breakdownMonths) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    int months = clampMonths(revenueMonths, DEFAULT_REVENUE_MONTHS);
    int breakdown = clampMonths(breakdownMonths, DEFAULT_BREAKDOWN_MONTHS);

    LocalDate today = LocalDate.now();
    Company company = companyRepository.findById(companyId).orElse(null);
    String currency = company != null ? company.getDefaultCurrency() : "EUR";

    List<Invoice> allInvoices = invoiceRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    List<DashboardRevenuePointResponse> revenue = revenueSeries(companyId, today, months);
    List<Invoice> recent = issuedWithinDates(allInvoices, today.minusMonths(breakdown), today);

    return new DashboardOverviewResponse(
        currency,
        firstNameOf(userId),
        company != null ? company.getName() : null,
        revenue,
        revenue.stream().map(DashboardRevenuePointResponse::invoiced)
            .reduce(BigDecimal.ZERO, BigDecimal::add),
        revenue.stream().map(DashboardRevenuePointResponse::collected)
            .reduce(BigDecimal.ZERO, BigDecimal::add),
        receivables(allInvoices, today),
        vat(allInvoices, today),
        topClients(companyId, recent),
        topProducts(recent),
        allInvoices.stream().filter(i -> i.getStatus() == InvoiceStatus.draft).count(),
        quoteRepository.countByCompanyIdAndStatusIn(
            companyId, List.of(QuoteStatus.draft, QuoteStatus.sent)),
        projectRepository.countByCompanyIdAndStatus(companyId, ProjectStatus.active),
        clientRepository.findByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(companyId).size(),
        // Purchases, bank feeds and receipt matching are not part of this system.
        false,
        false);
  }

  /**
   * Invoiced and collected, month by month, oldest first.
   *
   * <p>Every month in the range is emitted even when nothing happened in it. A chart that silently
   * skips empty months compresses a quiet summer into nothing and makes the trend a lie.
   */
  private List<DashboardRevenuePointResponse> revenueSeries(
      UUID companyId, LocalDate today, int months) {
    YearMonth last = YearMonth.from(today);
    YearMonth first = last.minusMonths(months - 1L);
    LocalDate from = first.atDay(1);
    LocalDate to = last.atEndOfMonth();

    Map<YearMonth, BigDecimal> invoiced = new HashMap<>();
    for (Invoice invoice
        : invoiceRepository.findByCompanyIdAndIssueDateBetween(companyId, from, to)) {
      if (!INVOICED_STATUSES.contains(invoice.getStatus()) || invoice.getIssueDate() == null) {
        continue;
      }
      invoiced.merge(YearMonth.from(invoice.getIssueDate()),
          nullSafe(invoice.getTotalAmount()), BigDecimal::add);
    }

    Map<YearMonth, BigDecimal> collected = new HashMap<>();
    OffsetDateTime fromTs = from.atStartOfDay().atOffset(ZoneOffset.UTC);
    OffsetDateTime toTs = to.plusDays(1).atStartOfDay().atOffset(ZoneOffset.UTC);
    for (Payment payment
        : paymentRepository.findByCompanyIdAndPaidAtBetween(companyId, fromTs, toTs)) {
      if (payment.getPaidAt() == null) {
        continue;
      }
      collected.merge(YearMonth.from(payment.getPaidAt()),
          nullSafe(payment.getAmount()), BigDecimal::add);
    }

    List<DashboardRevenuePointResponse> points = new ArrayList<>(months);
    for (int i = 0; i < months; i++) {
      YearMonth month = first.plusMonths(i);
      points.add(new DashboardRevenuePointResponse(
          month.toString(),
          month.atDay(1).format(MONTH_LABEL),
          invoiced.getOrDefault(month, BigDecimal.ZERO),
          collected.getOrDefault(month, BigDecimal.ZERO)));
    }
    return points;
  }

  /**
   * What is still owed, in three buckets that do not overlap.
   *
   * <p>Order matters: past its due date wins over everything, because that is the invoice the
   * operator has to act on today. A part-paid invoice that is also late belongs under overdue, not
   * counted in both places — the three buckets have to add up to the total printed above them.
   *
   * <p>Lateness is derived from the due date rather than the stored status, since the overdue
   * sweep only runs once a day.
   */
  private DashboardReceivablesResponse receivables(List<Invoice> invoices, LocalDate today) {
    BigDecimal overdueAmount = BigDecimal.ZERO;
    BigDecimal openAmount = BigDecimal.ZERO;
    BigDecimal partialAmount = BigDecimal.ZERO;
    long overdueCount = 0;
    long openCount = 0;
    long partialCount = 0;

    for (Invoice invoice : invoices) {
      if (!OUTSTANDING_STATUSES.contains(invoice.getStatus())) {
        continue;
      }
      BigDecimal balance = nullSafe(invoice.getBalanceDue());
      boolean late = invoice.getDueDate() != null && invoice.getDueDate().isBefore(today);
      if (late) {
        overdueAmount = overdueAmount.add(balance);
        overdueCount++;
      } else if (invoice.getStatus() == InvoiceStatus.partially_paid) {
        partialAmount = partialAmount.add(balance);
        partialCount++;
      } else {
        openAmount = openAmount.add(balance);
        openCount++;
      }
    }

    return new DashboardReceivablesResponse(
        overdueAmount.add(openAmount).add(partialAmount),
        new DashboardReceivablesResponse.Bucket(overdueAmount, overdueCount),
        new DashboardReceivablesResponse.Bucket(openAmount, openCount),
        new DashboardReceivablesResponse.Bucket(partialAmount, partialCount));
  }

  /**
   * The VAT quarter in progress.
   *
   * <p>A German advance return falls due on the tenth day of the month after the period, which is
   * what {@code dueDate} computes. Only output tax is available — there are no purchases in this
   * system — so the payable figure is one side of the return, and the response says as much rather
   * than implying the input tax is genuinely nought.
   */
  private DashboardVatResponse vat(List<Invoice> invoices, LocalDate today) {
    LocalDate start = LocalDate.of(today.getYear(), ((today.getMonthValue() - 1) / 3) * 3 + 1, 1);
    LocalDate end = start.plusMonths(3).minusDays(1);

    BigDecimal outputVat = BigDecimal.ZERO;
    BigDecimal gross = BigDecimal.ZERO;
    for (Invoice invoice : issuedWithinDates(invoices, start, end)) {
      outputVat = outputVat.add(nullSafe(invoice.getTaxAmount()));
      gross = gross.add(nullSafe(invoice.getTotalAmount()));
    }

    return new DashboardVatResponse(
        start,
        end,
        end.plusDays(1).withDayOfMonth(10),
        outputVat,
        gross.subtract(outputVat),
        outputVat,
        false);
  }

  /** The five customers billed most in the window, largest first. */
  private List<DashboardTopClientResponse> topClients(UUID companyId, List<Invoice> invoices) {
    Map<UUID, BigDecimal> totals = new LinkedHashMap<>();
    Map<UUID, Long> counts = new HashMap<>();
    for (Invoice invoice : invoices) {
      totals.merge(invoice.getClientId(), nullSafe(invoice.getTotalAmount()), BigDecimal::add);
      counts.merge(invoice.getClientId(), 1L, Long::sum);
    }
    if (totals.isEmpty()) {
      return List.of();
    }

    Map<UUID, String> names = clientRepository
        .findByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(companyId)
        .stream()
        .collect(Collectors.toMap(Client::getId, Client::getName, (a, b) -> a));

    return totals.entrySet().stream()
        .sorted(Map.Entry.<UUID, BigDecimal>comparingByValue().reversed())
        .limit(5)
        .map(entry -> new DashboardTopClientResponse(
            entry.getKey(),
            // Archived contacts are absent from the name map but still hold revenue.
            names.getOrDefault(entry.getKey(), "Archived contact"),
            entry.getValue(),
            counts.getOrDefault(entry.getKey(), 0L)))
        .toList();
  }

  /**
   * The five line descriptions that earned most in the window.
   *
   * <p>Grouped on the line text, because invoice lines carry no link back to the product
   * catalogue. Descriptions are compared case-insensitively after trimming so "Arbeitsstunde" and
   * "arbeitsstunde " land together; beyond that no cleverness is attempted, and the screen labels
   * the panel for what it is.
   */
  private List<DashboardTopProductResponse> topProducts(List<Invoice> invoices) {
    if (invoices.isEmpty()) {
      return List.of();
    }
    List<UUID> ids = invoices.stream().map(Invoice::getId).toList();

    Map<String, BigDecimal> amounts = new LinkedHashMap<>();
    Map<String, BigDecimal> quantities = new HashMap<>();
    Map<String, String> display = new HashMap<>();
    for (InvoiceItem item : invoiceItemRepository.findByInvoiceIdIn(ids)) {
      String label = item.getDescription() == null ? "" : item.getDescription().trim();
      if (label.isEmpty()) {
        continue;
      }
      String key = label.toLowerCase(Locale.ROOT);
      display.putIfAbsent(key, label);
      amounts.merge(key, nullSafe(item.getLineTotal()), BigDecimal::add);
      quantities.merge(key, nullSafe(item.getQuantity()), BigDecimal::add);
    }

    return amounts.entrySet().stream()
        .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
        .limit(5)
        .map(entry -> new DashboardTopProductResponse(
            display.get(entry.getKey()),
            entry.getValue(),
            quantities.getOrDefault(entry.getKey(), BigDecimal.ZERO)))
        .toList();
  }

  /**
   * The company's activity feed.
   *
   * <p>Reads the audit log and resolves the ids in it to names, in batch: one page of entries
   * costs one query for the actors, one for the invoices and one for the quotes, rather than a
   * lookup per row.
   */
  @Transactional(readOnly = true)
  public DashboardActivityResponse activity(UUID userId, Integer page, Integer size) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    int pageNumber = page == null || page < 0 ? 0 : page;
    int pageSize = size == null || size < 1 ? 5 : Math.min(size, 50);

    Page<AuditLog> found = auditLogRepository.findByCompanyIdOrderByCreatedAtDesc(
        companyId, PageRequest.of(pageNumber, pageSize));

    Map<UUID, String> actors = userRepository
        .findAllById(found.getContent().stream()
            .map(AuditLog::getActorUserId).filter(Objects::nonNull).collect(Collectors.toSet()))
        .stream()
        .collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));

    Map<UUID, Invoice> invoices = byId(
        invoiceRepository.findAllById(idsOf(found.getContent(), "invoice")), Invoice::getId);
    Map<UUID, Quote> quotes = byId(
        quoteRepository.findAllById(idsOf(found.getContent(), "quote")), Quote::getId);

    Set<UUID> clientIds = new HashSet<>();
    invoices.values().forEach(invoice -> clientIds.add(invoice.getClientId()));
    quotes.values().forEach(quote -> clientIds.add(quote.getClientId()));
    Map<UUID, String> clientNames = clientRepository.findAllById(clientIds).stream()
        .collect(Collectors.toMap(Client::getId, Client::getName, (a, b) -> a));

    List<DashboardActivityResponse.Entry> entries = found.getContent().stream()
        .map(log -> {
          String label = null;
          String client = null;
          if ("invoice".equals(log.getEntityType())) {
            Invoice invoice = invoices.get(log.getEntityId());
            if (invoice != null) {
              label = invoice.getInvoiceNumber();
              client = clientNames.get(invoice.getClientId());
            }
          } else if ("quote".equals(log.getEntityType())) {
            Quote quote = quotes.get(log.getEntityId());
            if (quote != null) {
              label = quote.getQuoteNumber();
              client = clientNames.get(quote.getClientId());
            }
          }
          return new DashboardActivityResponse.Entry(
              log.getId(),
              log.getCreatedAt(),
              // A null actor is the system acting on its own, e.g. a Stripe webhook.
              log.getActorUserId() == null ? null : actors.get(log.getActorUserId()),
              log.getEntityType(),
              log.getEntityId(),
              log.getAction(),
              label,
              client);
        })
        .toList();

    return new DashboardActivityResponse(entries, pageNumber, pageSize, found.getTotalElements());
  }

  /* --- helpers ------------------------------------------------------------ */

  /** The name to greet the operator by. Falls back to nothing rather than to a placeholder. */
  private String firstNameOf(UUID userId) {
    return userRepository.findById(userId)
        .map(User::getFullName)
        .filter(name -> name != null && !name.isBlank())
        .map(name -> name.trim().split("\\s+")[0])
        .orElse(null);
  }

  private static Set<UUID> idsOf(List<AuditLog> logs, String entityType) {
    return logs.stream()
        .filter(log -> entityType.equals(log.getEntityType()))
        .map(AuditLog::getEntityId)
        .filter(Objects::nonNull)
        .collect(Collectors.toSet());
  }

  private static <T> Map<UUID, T> byId(Iterable<T> values, Function<T, UUID> id) {
    Map<UUID, T> map = new HashMap<>();
    values.forEach(value -> map.put(id.apply(value), value));
    return map;
  }

  /** Issued invoices inside a window. Drafts and cancellations are not issued supply. */
  private static List<Invoice> issuedWithinDates(
      List<Invoice> invoices, LocalDate from, LocalDate to) {
    return invoices.stream()
        .filter(invoice -> INVOICED_STATUSES.contains(invoice.getStatus()))
        .filter(invoice -> invoice.getIssueDate() != null
            && !invoice.getIssueDate().isBefore(from)
            && !invoice.getIssueDate().isAfter(to))
        .toList();
  }

  /** Keeps a caller-supplied window inside something a chart can actually draw. */
  private static int clampMonths(Integer requested, int fallback) {
    if (requested == null) {
      return fallback;
    }
    return Math.min(Math.max(requested, 1), 36);
  }

  private static BigDecimal nullSafe(BigDecimal value) {
    return value == null ? BigDecimal.ZERO : value;
  }
}
