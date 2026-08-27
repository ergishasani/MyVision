package com.myvision.api.controller;

import com.myvision.api.dto.CheckoutSessionResponse;
import com.myvision.api.dto.RefundRequest;
import com.myvision.api.dto.RefundResponse;
import com.myvision.api.dto.StripeConfigResponse;
import com.myvision.api.service.PaymentService;
import com.myvision.api.service.StripeService;
import com.myvision.api.util.CurrentUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Stripe", description = "Stripe Checkout payment links, refunds, and webhook delivery")
public class StripeController {

  private final StripeService stripeService;
  private final PaymentService paymentService;

  public StripeController(StripeService stripeService, PaymentService paymentService) {
    this.stripeService = stripeService;
    this.paymentService = paymentService;
  }

  @GetMapping("/api/stripe/config")
  @Operation(summary = "Publishable key and whether Stripe is enabled on this server")
  public StripeConfigResponse config() {
    return stripeService.config();
  }

  @PostMapping("/api/invoices/{invoiceId}/checkout-session")
  @Operation(summary = "Create a Stripe Checkout session for the invoice balance")
  public CheckoutSessionResponse createCheckoutSession(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID invoiceId
  ) {
    return stripeService.createCheckoutSession(principal.getUserId(), invoiceId);
  }

  @GetMapping("/api/invoices/{invoiceId}/refunds")
  @Operation(summary = "List refunds recorded against an invoice")
  public List<RefundResponse> listRefunds(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID invoiceId
  ) {
    return paymentService.listRefunds(principal.getUserId(), invoiceId);
  }

  @PostMapping("/api/invoices/{invoiceId}/refunds")
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Refund a Stripe payment; omit the amount to refund everything refundable")
  public RefundResponse createRefund(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID invoiceId,
      @Valid @RequestBody(required = false) RefundRequest request
  ) {
    return stripeService.createRefund(principal.getUserId(), invoiceId, request);
  }

  /**
   * Stripe webhook receiver.
   *
   * <p>Authenticated by signature rather than by JWT, so it is permitted in {@code SecurityConfig}
   * and excluded from rate limiting. The body is taken as a raw string because the signature is
   * computed over the exact bytes Stripe sent.
   *
   * <p>Always answers 200 once the signature verifies. Stripe retries any non-2xx, and a handler
   * that cannot succeed would otherwise be retried for days.
   */
  @PostMapping("/api/stripe/webhook")
  @Operation(summary = "Receive a Stripe webhook event (signature-verified, no JWT)")
  public ResponseEntity<Void> webhook(
      @RequestBody String payload,
      @RequestHeader(name = "Stripe-Signature", required = false) String signature
  ) {
    if (signature == null || signature.isBlank()) {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }
    stripeService.handleWebhook(payload, signature);
    return ResponseEntity.ok().build();
  }
}
