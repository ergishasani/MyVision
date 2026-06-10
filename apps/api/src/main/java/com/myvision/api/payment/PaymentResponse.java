package com.myvision.api.payment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentResponse(
    UUID id,
    UUID invoiceId,
    BigDecimal amount,
    String currency,
    String method,
    OffsetDateTime paidAt,
    String reference,
    String notes,
    OffsetDateTime createdAt
) {

  public static PaymentResponse from(Payment payment) {
    return new PaymentResponse(
        payment.getId(),
        payment.getInvoiceId(),
        payment.getAmount(),
        payment.getCurrency(),
        payment.getMethod().name(),
        payment.getPaidAt(),
        payment.getReference(),
        payment.getNotes(),
        payment.getCreatedAt()
    );
  }
}
