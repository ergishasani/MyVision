package com.myvision.api.service;

import com.myvision.api.dto.DocumentResponseItem;
import com.myvision.api.dto.PaymentListItemResponse;
import com.myvision.api.entity.Client;
import com.myvision.api.entity.Invoice;
import com.myvision.api.entity.Payment;
import com.myvision.api.repository.ClientRepository;
import com.myvision.api.repository.DocumentRepository;
import com.myvision.api.repository.InvoiceRepository;
import com.myvision.api.repository.PaymentRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Company-wide reads across payments and documents.
 *
 * <p>Payments were only reachable per invoice, and stored documents had no endpoint at all, so
 * neither could be listed on their own screen.
 */
@Service
public class CompanyLedgerService {

  private final CompanyAccessService companyAccessService;
  private final PaymentRepository paymentRepository;
  private final InvoiceRepository invoiceRepository;
  private final ClientRepository clientRepository;
  private final DocumentRepository documentRepository;

  public CompanyLedgerService(
      CompanyAccessService companyAccessService,
      PaymentRepository paymentRepository,
      InvoiceRepository invoiceRepository,
      ClientRepository clientRepository,
      DocumentRepository documentRepository
  ) {
    this.companyAccessService = companyAccessService;
    this.paymentRepository = paymentRepository;
    this.invoiceRepository = invoiceRepository;
    this.clientRepository = clientRepository;
    this.documentRepository = documentRepository;
  }

  /**
   * Every payment recorded for the company, newest first.
   *
   * <p>Invoices and clients are loaded once and indexed rather than fetched per row, so the list
   * costs three queries regardless of how many payments there are.
   */
  @Transactional(readOnly = true)
  public List<PaymentListItemResponse> payments(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    List<Payment> payments = paymentRepository.findByCompanyIdOrderByPaidAtDesc(companyId);
    if (payments.isEmpty()) {
      return List.of();
    }

    Map<UUID, Invoice> invoices = new HashMap<>();
    for (Invoice invoice : invoiceRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)) {
      invoices.put(invoice.getId(), invoice);
    }
    Map<UUID, String> clientNames = new HashMap<>();
    for (Client client : clientRepository.findByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(companyId)) {
      clientNames.put(client.getId(), client.getName());
    }

    return payments.stream().map(payment -> {
      Invoice invoice = invoices.get(payment.getInvoiceId());
      UUID clientId = invoice == null ? null : invoice.getClientId();
      return new PaymentListItemResponse(
          payment.getId(),
          payment.getInvoiceId(),
          invoice == null ? null : invoice.getInvoiceNumber(),
          clientId,
          clientId == null ? null : clientNames.get(clientId),
          payment.getAmount(),
          payment.getCurrency(),
          payment.getMethod().name(),
          payment.getPaidAt(),
          payment.getReference(),
          payment.getStripeFeeAmount(),
          payment.getNetAmount()
      );
    }).toList();
  }

  @Transactional(readOnly = true)
  public List<DocumentResponseItem> documents(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return documentRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
        .stream()
        .map(DocumentResponseItem::from)
        .toList();
  }
}
