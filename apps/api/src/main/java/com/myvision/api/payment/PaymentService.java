package com.myvision.api.payment;

import com.myvision.api.common.BadRequestException;
import com.myvision.api.common.CompanyAccessService;
import com.myvision.api.invoice.Invoice;
import com.myvision.api.invoice.InvoiceRepository;
import com.myvision.api.invoice.InvoiceService;
import com.myvision.api.invoice.InvoiceStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

  private final PaymentRepository paymentRepository;
  private final InvoiceRepository invoiceRepository;
  private final InvoiceService invoiceService;
  private final CompanyAccessService companyAccessService;

  public PaymentService(
      PaymentRepository paymentRepository,
      InvoiceRepository invoiceRepository,
      InvoiceService invoiceService,
      CompanyAccessService companyAccessService
  ) {
    this.paymentRepository = paymentRepository;
    this.invoiceRepository = invoiceRepository;
    this.invoiceService = invoiceService;
    this.companyAccessService = companyAccessService;
  }

  @Transactional(readOnly = true)
  public List<PaymentResponse> list(UUID userId, UUID invoiceId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    invoiceService.requireInvoice(invoiceId, companyId);
    return paymentRepository.findByInvoiceIdAndCompanyIdOrderByPaidAtDesc(invoiceId, companyId)
        .stream()
        .map(PaymentResponse::from)
        .toList();
  }

  @Transactional
  public PaymentResponse create(UUID userId, UUID invoiceId, PaymentRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = invoiceService.requireInvoice(invoiceId, companyId);

    if (invoice.getStatus() == InvoiceStatus.draft) {
      throw new BadRequestException("Payments cannot be recorded on a draft invoice");
    }
    if (invoice.getStatus() == InvoiceStatus.cancelled) {
      throw new BadRequestException("Payments cannot be recorded on a cancelled invoice");
    }
    if (invoice.getStatus() == InvoiceStatus.paid) {
      throw new BadRequestException("Invoice is already fully paid");
    }
    if (request.amount().compareTo(invoice.getBalanceDue()) > 0) {
      throw new BadRequestException("Payment amount exceeds the invoice balance due");
    }

    Payment payment = new Payment();
    payment.setCompanyId(companyId);
    payment.setInvoiceId(invoice.getId());
    payment.setAmount(request.amount());
    payment.setCurrency(invoice.getCurrency());
    payment.setMethod(request.method() != null ? request.method() : PaymentMethod.bank_transfer);
    payment.setPaidAt(request.paidAt() != null ? request.paidAt() : OffsetDateTime.now());
    payment.setReference(request.reference());
    payment.setNotes(request.notes());
    payment = paymentRepository.save(payment);

    BigDecimal amountPaid = invoice.getAmountPaid().add(request.amount());
    BigDecimal balanceDue = invoice.getTotalAmount().subtract(amountPaid);
    invoice.setAmountPaid(amountPaid);
    invoice.setBalanceDue(balanceDue);
    if (balanceDue.compareTo(BigDecimal.ZERO) <= 0) {
      invoice.setStatus(InvoiceStatus.paid);
      invoice.setPaidAt(payment.getPaidAt());
    } else {
      invoice.setStatus(InvoiceStatus.partially_paid);
    }
    invoiceRepository.save(invoice);

    return PaymentResponse.from(payment);
  }
}
