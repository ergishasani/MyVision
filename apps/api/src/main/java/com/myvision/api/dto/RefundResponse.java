package com.myvision.api.dto;

import com.myvision.api.entity.Refund;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record RefundResponse(
    UUID id,
    UUID invoiceId,
    UUID paymentId,
    BigDecimal amount,
    String currency,
    String reason,
    String status,
    String stripeRefundId,
    OffsetDateTime createdAt
) {

  public static RefundResponse from(Refund refund) {
    return new RefundResponse(
        refund.getId(),
        refund.getInvoiceId(),
        refund.getPaymentId(),
        refund.getAmount(),
        refund.getCurrency(),
        refund.getReason(),
        refund.getStatus(),
        refund.getStripeRefundId(),
        refund.getCreatedAt()
    );
  }
}
