package com.myvision.api.dto;

import java.util.UUID;

/**
 * A Stripe Checkout session for one invoice. {@code url} is the hosted page the payer is sent to.
 */
public record CheckoutSessionResponse(
    String sessionId,
    String url,
    UUID invoiceId
) {
}
