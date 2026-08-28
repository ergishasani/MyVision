package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.dto.RefundResponse;
import com.myvision.api.entity.Refund;
import com.myvision.api.repository.RefundRepository;
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
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PaymentService {

  private final PaymentRepository paymentRepository;
  private final InvoiceRepository invoiceRepository;
  private final InvoiceService invoiceService;
  private final CompanyAccessService companyAccessService;
  private final RefundRepository refundRepository;
  private final AuditLogService auditLogService;

  public PaymentService(
      PaymentRepository paymentRepository,
      InvoiceRepository invoiceRepository,
      InvoiceService invoiceService,
      CompanyAccessService companyAccessService,
      RefundRepository refundRepository,
      AuditLogService auditLogService
  ) {
    this.paymentRepository = paymentRepository;
    this.invoiceRepository = invoiceRepository;
    this.invoiceService = invoiceService;
    this.companyAccessService = companyAccessService;
    this.refundRepository = refundRepository;
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

  /**
   * Records a payment that settled outside the app, currently Stripe Checkout.
   *
   * <p>There is no acting user here because the caller is a signature-verified webhook, so the
   * company is supplied by the caller from the session metadata and the audit entry has a null
   * actor.
   *
   * <p>Returns empty when this PaymentIntent has already been recorded. Stripe redelivers an
   * event until it gets a 2xx, so this makes a replay a no-op instead of a second payment.
   */
  @Transactional
  public Optional<PaymentResponse> recordStripePayment(
      UUID companyId,
      UUID invoiceId,
      BigDecimal amount,
      String currency,
      String paymentIntentId,
      String checkoutSessionId
  ) {
    if (paymentIntentId != null && paymentRepository.existsByStripePaymentIntentId(paymentIntentId)) {
      return Optional.empty();
    }

    Invoice invoice = invoiceService.requireInvoice(invoiceId, companyId);
    if (invoice.getStatus() == InvoiceStatus.cancelled) {
      throw new BadRequestException("Payments cannot be recorded on a cancelled invoice");
    }

    Payment payment = new Payment();
    payment.setCompanyId(companyId);
    payment.setInvoiceId(invoice.getId());
    payment.setAmount(amount);
    payment.setCurrency(currency != null ? currency : invoice.getCurrency());
    payment.setMethod(PaymentMethod.stripe);
    payment.setPaidAt(OffsetDateTime.now());
    payment.setReference(paymentIntentId);
    payment.setStripePaymentIntentId(paymentIntentId);
    payment.setStripeCheckoutSessionId(checkoutSessionId);
    payment = paymentRepository.save(payment);

    // Unlike the manual path this does not reject an amount above the balance due. Stripe has
    // already captured the money, so refusing it here would lose the record of a real payment.
    // An invoice edited after checkout started can therefore land slightly overpaid, which shows
    // up as a negative balance rather than silently disappearing.
    BigDecimal amountPaid = invoice.getAmountPaid().add(amount);
    BigDecimal balanceDue = invoice.getTotalAmount().subtract(amountPaid);
    invoice.setAmountPaid(amountPaid);
    invoice.setBalanceDue(balanceDue);
    if (balanceDue.compareTo(BigDecimal.ZERO) <= 0) {
      invoice.setStatus(InvoiceStatus.paid);
      invoice.setPaidAt(payment.getPaidAt());
    } else {
      invoice.setStatus(InvoiceStatus.partially_paid);
    }
    invoice.setStripePaymentIntentId(paymentIntentId);
    invoiceRepository.save(invoice);

    auditLogService.record(
        companyId,
        null,
        "payment",
        payment.getId(),
        "stripe_captured",
        "{\"invoiceId\":\"%s\",\"amount\":\"%s\",\"paymentIntentId\":\"%s\"}"
            .formatted(invoice.getId(), payment.getAmount(), paymentIntentId)
    );

    return Optional.of(PaymentResponse.from(payment));
  }

  /**
   * Records money returned to the payer and rolls the invoice balance back.
   *
   * <p>Idempotent on the Stripe refund id, so a redelivered webhook cannot reverse the same money
   * twice. Returns empty when the refund is already recorded.
   *
   * <p>The invoice is never dragged back to {@code draft} or out of {@code cancelled}: a refund
   * changes how much has been paid, not whether the invoice was issued or withdrawn.
   */
  @Transactional
  public Optional<RefundResponse> recordRefund(
      UUID companyId,
      UUID invoiceId,
      UUID paymentId,
      BigDecimal amount,
      String currency,
      String stripeRefundId,
      String reason,
      String status,
      UUID actorUserId
  ) {
    if (stripeRefundId != null && refundRepository.existsByStripeRefundId(stripeRefundId)) {
      return Optional.empty();
    }

    Invoice invoice = invoiceService.requireInvoice(invoiceId, companyId);

    Refund refund = new Refund();
    refund.setCompanyId(companyId);
    refund.setInvoiceId(invoiceId);
    refund.setPaymentId(paymentId);
    refund.setAmount(amount);
    refund.setCurrency(currency != null ? currency : invoice.getCurrency());
    refund.setReason(reason);
    refund.setStatus(status != null ? status : "succeeded");
    refund.setStripeRefundId(stripeRefundId);
    refund = refundRepository.save(refund);

    BigDecimal amountPaid = invoice.getAmountPaid().subtract(amount);
    if (amountPaid.compareTo(BigDecimal.ZERO) < 0) {
      // Refunding more than was recorded should not leave a negative paid figure on the invoice.
      amountPaid = BigDecimal.ZERO.setScale(2);
    }
    invoice.setAmountPaid(amountPaid);
    invoice.setBalanceDue(invoice.getTotalAmount().subtract(amountPaid));

    if (invoice.getStatus() != InvoiceStatus.cancelled) {
      if (amountPaid.compareTo(BigDecimal.ZERO) <= 0) {
        // Fully refunded: back to owing the whole amount. The overdue sweep re-flags it if the
        // due date has already passed.
        invoice.setStatus(InvoiceStatus.sent);
        invoice.setPaidAt(null);
      } else if (invoice.getBalanceDue().compareTo(BigDecimal.ZERO) > 0) {
        invoice.setStatus(InvoiceStatus.partially_paid);
        invoice.setPaidAt(null);
      }
    }
    invoiceRepository.save(invoice);

    auditLogService.record(
        companyId,
        actorUserId,
        "refund",
        refund.getId(),
        "created",
        "{\"invoiceId\":\"%s\",\"amount\":\"%s\",\"stripeRefundId\":\"%s\"}"
            .formatted(invoiceId, amount, stripeRefundId)
    );

    return Optional.of(RefundResponse.from(refund));
  }

  @Transactional(readOnly = true)
  public List<RefundResponse> listRefunds(UUID userId, UUID invoiceId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    invoiceService.requireInvoice(invoiceId, companyId);
    return refundRepository.findByInvoiceIdAndCompanyIdOrderByCreatedAtDesc(invoiceId, companyId)
        .stream()
        .map(RefundResponse::from)
        .toList();
  }

  /** How much of a payment has not yet been refunded. */
  @Transactional(readOnly = true)
  public BigDecimal refundableAmount(Payment payment) {
    BigDecimal alreadyRefunded = refundRepository.sumRefundedForPayment(payment.getId());
    BigDecimal remaining = payment.getAmount().subtract(alreadyRefunded);
    return remaining.compareTo(BigDecimal.ZERO) > 0 ? remaining : BigDecimal.ZERO.setScale(2);
  }

  /**
   * Stores the processor's cut against a payment.
   *
   * <p>Best-effort and never fatal: the gross amount is what the invoice is settled against, so a
   * missing fee leaves both columns null rather than blocking the payment.
   */
  @Transactional
  public void applyStripeFees(UUID paymentId, BigDecimal fee, BigDecimal net) {
    paymentRepository.findById(paymentId).ifPresent(payment -> {
      payment.setStripeFeeAmount(fee);
      payment.setNetAmount(net);
      paymentRepository.save(payment);
    });
  }
}
