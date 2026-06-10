package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.service.AuditLogService;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.service.CompanyAccessService;
import com.myvision.api.entity.Invoice;
import com.myvision.api.repository.InvoiceRepository;
import com.myvision.api.service.InvoiceService;
import com.myvision.api.entity.InvoiceStatus;
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
  private final AuditLogService auditLogService;

  public PaymentService(
      PaymentRepository paymentRepository,
      InvoiceRepository invoiceRepository,
      InvoiceService invoiceService,
      CompanyAccessService companyAccessService,
      AuditLogService auditLogService
  ) {
    this.paymentRepository = paymentRepository;
    this.invoiceRepository = invoiceRepository;
    this.invoiceService = invoiceService;
    this.companyAccessService = companyAccessService;
    this.auditLogService = auditLogService;
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
    auditLogService.record(
        companyId,
        userId,
        "payment",
        payment.getId(),
        "created",
        "{\"invoiceId\":\"%s\",\"amount\":\"%s\"}".formatted(invoice.getId(), payment.getAmount())
    );

    return PaymentResponse.from(payment);
  }
}
