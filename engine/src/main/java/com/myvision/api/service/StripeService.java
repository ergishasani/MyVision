package com.myvision.api.service;

import com.myvision.api.dto.CheckoutSessionResponse;
import com.myvision.api.dto.PaymentResponse;
import com.myvision.api.dto.RefundRequest;
import com.myvision.api.dto.RefundResponse;
import com.myvision.api.dto.StripeConfigResponse;
import com.myvision.api.entity.Invoice;
import com.myvision.api.entity.InvoiceStatus;
import com.myvision.api.entity.Payment;
import com.myvision.api.entity.StripeEvent;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.repository.InvoiceRepository;
import com.myvision.api.repository.PaymentRepository;
import com.myvision.api.repository.StripeEventRepository;
import com.stripe.StripeClient;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Charge;
import com.stripe.model.Dispute;
import com.stripe.model.Event;
import com.stripe.model.PaymentIntent;
import com.stripe.model.Refund;
import com.stripe.model.StripeError;
import com.stripe.model.StripeObject;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.PaymentIntentRetrieveParams;
import com.stripe.param.RefundCreateParams;
import com.stripe.param.checkout.SessionCreateParams;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Stripe Checkout integration: payment links, refunds, and webhook reconciliation.
 *
 * <p>The service is inert until {@code STRIPE_SECRET_KEY} is set: every outbound entry point
 * checks {@link #isConfigured()} first and the endpoints answer 503 rather than failing obscurely.
 * That lets the rest of the system ship and be tested without Stripe credentials existing yet.
 */
@Service
public class StripeService {

  private static final Logger log = LoggerFactory.getLogger(StripeService.class);

  /**
   * Currencies Stripe bills in whole units. Everything not listed here uses two decimal places,
   * except the three-decimal set below. Getting this wrong charges a customer 100x, so it is
   * spelled out rather than assumed.
   */
  private static final Set<String> ZERO_DECIMAL_CURRENCIES = Set.of(
      "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga",
      "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"
  );

  private static final Set<String> THREE_DECIMAL_CURRENCIES = Set.of(
      "bhd", "jod", "kwd", "omr", "tnd"
  );

  /** Reasons Stripe accepts on a refund. Anything else is sent as no reason at all. */
  private static final Set<String> STRIPE_REFUND_REASONS = Set.of(
      "duplicate", "fraudulent", "requested_by_customer");

  private static final String EVENT_CHECKOUT_COMPLETED = "checkout.session.completed";
  private static final String EVENT_CHECKOUT_ASYNC_SUCCEEDED = "checkout.session.async_payment_succeeded";
  private static final String EVENT_CHECKOUT_ASYNC_FAILED = "checkout.session.async_payment_failed";
  private static final String EVENT_CHECKOUT_EXPIRED = "checkout.session.expired";
  private static final String EVENT_CHARGE_REFUNDED = "charge.refunded";
  private static final String EVENT_PAYMENT_FAILED = "payment_intent.payment_failed";
  private static final String EVENT_DISPUTE_CREATED = "charge.dispute.created";

  private final InvoiceService invoiceService;
  private final InvoiceRepository invoiceRepository;
  private final PaymentService paymentService;
  private final PaymentRepository paymentRepository;
  private final CompanyAccessService companyAccessService;
  private final StripeEventRepository stripeEventRepository;
  private final AuditLogService auditLogService;

  private final String secretKey;
  private final String webhookSecret;
  private final String publishableKey;
  private final String successUrl;
  private final String cancelUrl;

  private final StripeClient client;

  public StripeService(
      InvoiceService invoiceService,
      InvoiceRepository invoiceRepository,
      PaymentService paymentService,
      PaymentRepository paymentRepository,
      CompanyAccessService companyAccessService,
      StripeEventRepository stripeEventRepository,
      AuditLogService auditLogService,
      @Value("${stripe.secret-key}") String secretKey,
      @Value("${stripe.webhook-secret}") String webhookSecret,
      @Value("${stripe.publishable-key}") String publishableKey,
      @Value("${stripe.success-url}") String successUrl,
      @Value("${stripe.cancel-url}") String cancelUrl
  ) {
    this.invoiceService = invoiceService;
    this.invoiceRepository = invoiceRepository;
    this.paymentService = paymentService;
    this.paymentRepository = paymentRepository;
    this.companyAccessService = companyAccessService;
    this.stripeEventRepository = stripeEventRepository;
    this.auditLogService = auditLogService;
    this.secretKey = secretKey == null ? "" : secretKey.trim();
    this.webhookSecret = webhookSecret == null ? "" : webhookSecret.trim();
    this.publishableKey = publishableKey == null ? "" : publishableKey.trim();
    this.successUrl = successUrl;
    this.cancelUrl = cancelUrl;
    this.client = this.secretKey.isBlank() ? null : new StripeClient(this.secretKey);

    if (this.client == null) {
      log.info("Stripe is not configured (STRIPE_SECRET_KEY is empty); payment links are disabled");
    }
  }

  public boolean isConfigured() {
    return client != null;
  }

  public boolean isWebhookConfigured() {
    return !webhookSecret.isBlank();
  }

  /** Only the publishable key is exposed; the secret key never leaves the server. */
  public StripeConfigResponse config() {
    return new StripeConfigResponse(isConfigured(), publishableKey.isBlank() ? null : publishableKey);
  }

  /**
   * Creates a Stripe Checkout session for the outstanding balance on an invoice.
   *
   * <p>The session carries exactly one line item priced at the invoice balance. Itemising the
   * invoice line by line would make Stripe re-derive the total from its own rounding of each
   * line, and any disagreement with our stored total would charge the customer the wrong amount.
   * One line item keeps our number authoritative.
   */
  @Transactional
  public CheckoutSessionResponse createCheckoutSession(UUID userId, UUID invoiceId) {
    requireConfigured();

    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = invoiceService.requireInvoice(invoiceId, companyId);

    if (invoice.getStatus() == InvoiceStatus.draft) {
      throw new BadRequestException("A draft invoice cannot be paid; mark it sent first");
    }
    if (invoice.getStatus() == InvoiceStatus.cancelled) {
      throw new BadRequestException("A cancelled invoice cannot be paid");
    }
    if (invoice.getStatus() == InvoiceStatus.paid
        || invoice.getBalanceDue().compareTo(BigDecimal.ZERO) <= 0) {
      throw new BadRequestException("Invoice is already fully paid");
    }

    String currency = invoice.getCurrency().toLowerCase(Locale.ROOT);
    long unitAmount = toMinorUnits(invoice.getBalanceDue(), currency);

    SessionCreateParams params = SessionCreateParams.builder()
        .setMode(SessionCreateParams.Mode.PAYMENT)
        .setSuccessUrl(successUrl)
        .setCancelUrl(cancelUrl)
        .setClientReferenceId(invoice.getId().toString())
        .putMetadata("invoiceId", invoice.getId().toString())
        .putMetadata("companyId", companyId.toString())
        .putMetadata("invoiceNumber", invoice.getInvoiceNumber())
        // Metadata on the session does not reach the PaymentIntent on its own. Copying it here is
        // what lets payment_intent.payment_failed and dispute events be traced back to an invoice.
        .setPaymentIntentData(SessionCreateParams.PaymentIntentData.builder()
            .setDescription("Invoice " + invoice.getInvoiceNumber())
            .putMetadata("invoiceId", invoice.getId().toString())
            .putMetadata("companyId", companyId.toString())
            .build())
        .addLineItem(SessionCreateParams.LineItem.builder()
            .setQuantity(1L)
            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                .setCurrency(currency)
                .setUnitAmount(unitAmount)
                .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                    .setName("Invoice " + invoice.getInvoiceNumber())
                    .build())
                .build())
            .build())
        .build();

    Session session;
    try {
      session = client.checkout().sessions().create(params);
    } catch (StripeException e) {
      log.error("Stripe checkout session creation failed for invoice {}", invoice.getId(), e);
      throw new BadRequestException("Could not start a Stripe payment: " + e.getMessage());
    }

    invoice.setStripeCheckoutSessionId(session.getId());
    invoiceRepository.save(invoice);

    return new CheckoutSessionResponse(session.getId(), session.getUrl(), invoice.getId());
  }

  /**
   * Refunds a Stripe payment on an invoice.
   *
   * <p>Stripe is called first and the local record follows, so the app never claims to have
   * returned money that Stripe did not actually return. Omitting the amount refunds whatever is
   * still refundable on the payment.
   */
  @Transactional
  public RefundResponse createRefund(UUID userId, UUID invoiceId, RefundRequest request) {
    requireConfigured();

    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = invoiceService.requireInvoice(invoiceId, companyId);

    if (invoice.getStripePaymentIntentId() == null) {
      throw new BadRequestException("This invoice has no Stripe payment to refund");
    }

    Payment payment = paymentRepository
        .findByStripePaymentIntentId(invoice.getStripePaymentIntentId())
        .orElseThrow(() -> new BadRequestException("No recorded Stripe payment for this invoice"));

    BigDecimal refundable = paymentService.refundableAmount(payment);
    if (refundable.compareTo(BigDecimal.ZERO) <= 0) {
      throw new BadRequestException("This payment has already been fully refunded");
    }

    BigDecimal amount = request != null && request.amount() != null ? request.amount() : refundable;
    if (amount.compareTo(refundable) > 0) {
      throw new BadRequestException(
          "Refund exceeds the refundable amount of " + refundable.toPlainString());
    }

    String reason = request == null ? null : request.reason();
    RefundCreateParams.Builder params = RefundCreateParams.builder()
        .setPaymentIntent(invoice.getStripePaymentIntentId())
        .setAmount(toMinorUnits(amount, payment.getCurrency()))
        .putMetadata("invoiceId", invoiceId.toString())
        .putMetadata("companyId", companyId.toString());
    if (reason != null && STRIPE_REFUND_REASONS.contains(reason)) {
      params.setReason(RefundCreateParams.Reason.valueOf(reason.toUpperCase(Locale.ROOT)));
    }

    Refund refund;
    try {
      refund = client.refunds().create(params.build());
    } catch (StripeException e) {
      log.error("Stripe refund failed for invoice {}", invoiceId, e);
      throw new BadRequestException("Could not refund through Stripe: " + e.getMessage());
    }

    return paymentService.recordRefund(
        companyId,
        invoiceId,
        payment.getId(),
        amount,
        payment.getCurrency(),
        refund.getId(),
        reason,
        refund.getStatus(),
        userId
    ).orElseThrow(() -> new BadRequestException("This refund has already been recorded"));
  }

  /**
   * Verifies and applies a Stripe webhook payload.
   *
   * <p>{@code payload} must be the raw request body. Re-serialising a parsed body changes the
   * bytes and the signature check then fails.
   */
  @Transactional
  public void handleWebhook(String payload, String signatureHeader) {
    if (!isWebhookConfigured()) {
      throw new BadRequestException("Stripe webhooks are not configured");
    }

    Event event;
    try {
      event = Webhook.constructEvent(payload, signatureHeader, webhookSecret);
    } catch (SignatureVerificationException e) {
      // Never trust an unverified body: an attacker who could post here would be able to mark
      // any invoice paid.
      throw new BadRequestException("Invalid Stripe signature");
    }

    if (stripeEventRepository.existsById(event.getId())) {
      log.debug("Stripe event {} already processed; ignoring redelivery", event.getId());
      return;
    }

    switch (event.getType()) {
      case EVENT_CHECKOUT_COMPLETED, EVENT_CHECKOUT_ASYNC_SUCCEEDED -> handleCheckoutSettled(event);
      case EVENT_CHECKOUT_EXPIRED, EVENT_CHECKOUT_ASYNC_FAILED -> handleCheckoutAbandoned(event);
      case EVENT_CHARGE_REFUNDED -> handleChargeRefunded(event);
      case EVENT_PAYMENT_FAILED -> handlePaymentFailed(event);
      case EVENT_DISPUTE_CREATED -> handleDisputeCreated(event);
      // Acknowledged but not acted on. Recording it stops Stripe retrying an event we will
      // never handle.
      default -> recordProcessed(event, null, null);
    }
  }

  private void handleCheckoutSettled(Event event) {
    Session session = extract(event, Session.class);
    if (session == null) {
      recordProcessed(event, null, null);
      return;
    }

    // A session can complete while an asynchronous method (SEPA debit, for example) is still
    // pending. Only settled money becomes a payment.
    if (!"paid".equals(session.getPaymentStatus())) {
      log.info("Stripe session {} completed with payment_status={}; no payment recorded",
          session.getId(), session.getPaymentStatus());
      recordProcessed(event, null, null);
      return;
    }

    UUID invoiceId = metadataUuid(session.getMetadata(), "invoiceId");
    UUID companyId = metadataUuid(session.getMetadata(), "companyId");
    if (invoiceId == null || companyId == null) {
      log.warn("Stripe session {} has no invoice metadata; nothing to reconcile", session.getId());
      recordProcessed(event, null, null);
      return;
    }

    String currency = session.getCurrency() == null
        ? "EUR" : session.getCurrency().toUpperCase(Locale.ROOT);
    BigDecimal amount = fromMinorUnits(session.getAmountTotal(), currency);

    Optional<PaymentResponse> recorded = paymentService.recordStripePayment(
        companyId, invoiceId, amount, currency, session.getPaymentIntent(), session.getId());

    recorded.ifPresent(payment ->
        captureFees(payment.id(), session.getPaymentIntent(), currency));

    recordProcessed(event, companyId, invoiceId);
  }

  /** An expired or failed session leaves the invoice unpaid; drop the stale session reference. */
  private void handleCheckoutAbandoned(Event event) {
    Session session = extract(event, Session.class);
    if (session == null) {
      recordProcessed(event, null, null);
      return;
    }

    UUID invoiceId = metadataUuid(session.getMetadata(), "invoiceId");
    UUID companyId = metadataUuid(session.getMetadata(), "companyId");
    if (invoiceId == null || companyId == null) {
      recordProcessed(event, null, null);
      return;
    }

    invoiceRepository.findByIdAndCompanyId(invoiceId, companyId).ifPresent(invoice -> {
      if (session.getId().equals(invoice.getStripeCheckoutSessionId())) {
        invoice.setStripeCheckoutSessionId(null);
        invoiceRepository.save(invoice);
      }
    });

    recordProcessed(event, companyId, invoiceId);
  }

  /**
   * Reconciles a refund, including one issued from the Stripe dashboard rather than through this
   * app.
   *
   * <p>Stripe reports {@code amount_refunded} cumulatively on the charge, so the new refund is the
   * difference between that figure and what is already recorded. Handling the delta rather than
   * the raw total is what makes repeated partial refunds add up correctly.
   */
  private void handleChargeRefunded(Event event) {
    Charge charge = extract(event, Charge.class);
    if (charge == null || charge.getPaymentIntent() == null) {
      recordProcessed(event, null, null);
      return;
    }

    Payment payment = paymentRepository
        .findByStripePaymentIntentId(charge.getPaymentIntent())
        .orElse(null);
    if (payment == null) {
      log.warn("Stripe charge {} refunded but no matching payment is recorded", charge.getId());
      recordProcessed(event, null, null);
      return;
    }

    BigDecimal refundedTotal = fromMinorUnits(charge.getAmountRefunded(), payment.getCurrency());
    BigDecimal alreadyRecorded =
        payment.getAmount().subtract(paymentService.refundableAmount(payment));
    BigDecimal delta = refundedTotal.subtract(alreadyRecorded);

    if (delta.compareTo(BigDecimal.ZERO) > 0) {
      paymentService.recordRefund(
          payment.getCompanyId(),
          payment.getInvoiceId(),
          payment.getId(),
          delta,
          payment.getCurrency(),
          // The charge event does not name the individual refund. Event-level idempotency plus
          // the delta above is what keeps this from applying twice.
          null,
          "stripe_dashboard",
          "succeeded",
          null
      );
    }

    recordProcessed(event, payment.getCompanyId(), payment.getInvoiceId());
  }

  /** Records why a card was declined so the operator sees a reason, not just an unpaid invoice. */
  private void handlePaymentFailed(Event event) {
    PaymentIntent intent = extract(event, PaymentIntent.class);
    if (intent == null) {
      recordProcessed(event, null, null);
      return;
    }

    UUID invoiceId = metadataUuid(intent.getMetadata(), "invoiceId");
    UUID companyId = metadataUuid(intent.getMetadata(), "companyId");
    if (invoiceId == null || companyId == null) {
      recordProcessed(event, null, null);
      return;
    }

    StripeError error = intent.getLastPaymentError();
    String message = error == null ? "Payment failed" : describe(error);

    invoiceRepository.findByIdAndCompanyId(invoiceId, companyId).ifPresent(invoice -> {
      invoice.setLastPaymentError(message);
      invoice.setLastPaymentErrorAt(OffsetDateTime.now());
      invoiceRepository.save(invoice);
      auditLogService.record(companyId, null, "invoice", invoiceId, "stripe_payment_failed",
          "{\"paymentIntentId\":\"%s\"}".formatted(intent.getId()));
    });

    recordProcessed(event, companyId, invoiceId);
  }

  /**
   * Audits a chargeback.
   *
   * <p>The balance is deliberately left alone. A dispute is not a refund — the money is held, not
   * returned, and it may be won. Reversing the invoice here would misstate it for whatever the
   * dispute window lasts.
   */
  private void handleDisputeCreated(Event event) {
    Dispute dispute = extract(event, Dispute.class);
    if (dispute == null || dispute.getPaymentIntent() == null) {
      recordProcessed(event, null, null);
      return;
    }

    Payment payment = paymentRepository
        .findByStripePaymentIntentId(dispute.getPaymentIntent())
        .orElse(null);
    if (payment == null) {
      recordProcessed(event, null, null);
      return;
    }

    auditLogService.record(
        payment.getCompanyId(),
        null,
        "invoice",
        payment.getInvoiceId(),
        "stripe_dispute_opened",
        "{\"disputeId\":\"%s\",\"reason\":\"%s\",\"status\":\"%s\",\"amount\":\"%s\"}".formatted(
            dispute.getId(),
            dispute.getReason(),
            dispute.getStatus(),
            fromMinorUnits(dispute.getAmount(), payment.getCurrency()))
    );

    recordProcessed(event, payment.getCompanyId(), payment.getInvoiceId());
  }

  /**
   * Stores what Stripe kept from a payment.
   *
   * <p>Best-effort by design: the invoice is settled against the gross amount, so a failure to
   * read the balance transaction leaves the fee columns null instead of breaking the webhook.
   */
  private void captureFees(UUID paymentId, String paymentIntentId, String currency) {
    if (!isConfigured() || paymentIntentId == null) {
      return;
    }
    try {
      PaymentIntent intent = client.paymentIntents().retrieve(
          paymentIntentId,
          PaymentIntentRetrieveParams.builder()
              .addExpand("latest_charge.balance_transaction")
              .build());

      Charge charge = intent.getLatestChargeObject();
      if (charge == null || charge.getBalanceTransactionObject() == null) {
        return;
      }
      BigDecimal fee = fromMinorUnits(charge.getBalanceTransactionObject().getFee(), currency);
      BigDecimal net = fromMinorUnits(charge.getBalanceTransactionObject().getNet(), currency);
      paymentService.applyStripeFees(paymentId, fee, net);
    } catch (StripeException | RuntimeException e) {
      log.warn("Could not read Stripe fees for payment intent {}: {}", paymentIntentId, e.getMessage());
    }
  }

  private static String describe(StripeError error) {
    String message = error.getMessage() == null ? "Payment failed" : error.getMessage();
    String code = error.getDeclineCode() != null ? error.getDeclineCode() : error.getCode();
    return code == null ? message : "%s (%s)".formatted(message, code);
  }

  private void recordProcessed(Event event, UUID companyId, UUID invoiceId) {
    StripeEvent processed = new StripeEvent();
    processed.setId(event.getId());
    processed.setType(event.getType());
    processed.setCompanyId(companyId);
    processed.setInvoiceId(invoiceId);
    stripeEventRepository.save(processed);
  }

  private <T extends StripeObject> T extract(Event event, Class<T> type) {
    StripeObject object = null;
    try {
      object = event.getDataObjectDeserializer().getObject().orElse(null);
    } catch (RuntimeException e) {
      // An event carrying no usable api_version makes getObject() throw instead of returning
      // empty. Falling through to deserializeUnsafe keeps a webhook from 500ing, which would
      // otherwise leave Stripe retrying the same event for days.
      log.debug("Stripe event {} did not deserialize against the pinned API version", event.getId());
    }

    if (object == null) {
      // The account's Stripe API version differs from the library's. deserializeUnsafe still
      // yields the payload, and the fields read here are stable across versions.
      try {
        object = event.getDataObjectDeserializer().deserializeUnsafe();
      } catch (Exception e) {
        log.error("Could not deserialize Stripe event {}", event.getId(), e);
        return null;
      }
    }
    return type.isInstance(object) ? type.cast(object) : null;
  }

  private void requireConfigured() {
    if (!isConfigured()) {
      throw new StripeNotConfiguredException();
    }
  }

  private static UUID metadataUuid(Map<String, String> metadata, String key) {
    if (metadata == null) {
      return null;
    }
    String value = metadata.get(key);
    if (value == null || value.isBlank()) {
      return null;
    }
    try {
      return UUID.fromString(value);
    } catch (IllegalArgumentException e) {
      return null;
    }
  }

  /** Number of decimal places Stripe uses for a currency. */
  private static int exponentFor(String currency) {
    String code = currency == null ? "eur" : currency.toLowerCase(Locale.ROOT);
    if (ZERO_DECIMAL_CURRENCIES.contains(code)) {
      return 0;
    }
    if (THREE_DECIMAL_CURRENCIES.contains(code)) {
      return 3;
    }
    return 2;
  }

  static long toMinorUnits(BigDecimal amount, String currency) {
    return amount.setScale(exponentFor(currency), RoundingMode.HALF_UP)
        .movePointRight(exponentFor(currency))
        .longValueExact();
  }

  static BigDecimal fromMinorUnits(Long minorUnits, String currency) {
    if (minorUnits == null) {
      return BigDecimal.ZERO;
    }
    return BigDecimal.valueOf(minorUnits).movePointLeft(exponentFor(currency));
  }

  /** Raised when a Stripe endpoint is called before credentials are configured. */
  public static class StripeNotConfiguredException extends RuntimeException {
    public StripeNotConfiguredException() {
      super("Stripe is not configured on this server");
    }
  }
}
