package com.myvision.api.dashboard;

import com.myvision.api.client.ClientRepository;
import com.myvision.api.client.ClientResponse;
import com.myvision.api.common.CompanyAccessService;
import com.myvision.api.invoice.InvoiceItemRepository;
import com.myvision.api.invoice.InvoiceRepository;
import com.myvision.api.invoice.InvoiceResponse;
import com.myvision.api.invoice.InvoiceStatus;
import com.myvision.api.payment.PaymentRepository;
import com.myvision.api.project.ProjectRepository;
import com.myvision.api.project.ProjectStatus;
import com.myvision.api.quote.QuoteRepository;
import com.myvision.api.quote.QuoteStatus;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
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

  public DashboardService(
      InvoiceRepository invoiceRepository,
      InvoiceItemRepository invoiceItemRepository,
      PaymentRepository paymentRepository,
      ProjectRepository projectRepository,
      QuoteRepository quoteRepository,
      ClientRepository clientRepository,
      CompanyAccessService companyAccessService
  ) {
    this.invoiceRepository = invoiceRepository;
    this.invoiceItemRepository = invoiceItemRepository;
    this.paymentRepository = paymentRepository;
    this.projectRepository = projectRepository;
    this.quoteRepository = quoteRepository;
    this.clientRepository = clientRepository;
    this.companyAccessService = companyAccessService;
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
}
