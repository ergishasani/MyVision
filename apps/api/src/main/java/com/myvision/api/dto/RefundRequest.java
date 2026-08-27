package com.myvision.api.dto;

import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * A refund against an invoice's Stripe payment.
 *
 * <p>{@code amount} is optional; omitting it refunds everything still refundable on the payment.
 * {@code reason} must be one of Stripe's accepted values — {@code duplicate},
 * {@code fraudulent}, {@code requested_by_customer} — or null.
 */
public record RefundRequest(
    @Positive
    BigDecimal amount,

    @Size(max = 255)
    String reason
) {
}
