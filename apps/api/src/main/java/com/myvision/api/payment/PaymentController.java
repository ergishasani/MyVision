package com.myvision.api.payment;

import com.myvision.api.auth.CurrentUserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/invoices/{invoiceId}/payments")
@Tag(name = "Payments", description = "Payments recorded against an invoice; updates balance and status")
public class PaymentController {

  private final PaymentService paymentService;

  public PaymentController(PaymentService paymentService) {
    this.paymentService = paymentService;
  }

  @GetMapping
  public List<PaymentResponse> list(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID invoiceId
  ) {
    return paymentService.list(principal.getUserId(), invoiceId);
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public PaymentResponse create(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID invoiceId,
      @Valid @RequestBody PaymentRequest request
  ) {
    return paymentService.create(principal.getUserId(), invoiceId, request);
  }
}
