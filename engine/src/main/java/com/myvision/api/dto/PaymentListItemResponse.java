package com.myvision.api.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A payment as it appears in the company-wide list.
 *
 * <p>Carries the invoice number and client name alongside the payment so the screen can render a
 * row without fetching each invoice separately.
 */
public record PaymentListItemResponse(
    UUID id,
    UUID invoiceId,
    String invoiceNumber,
    UUID clientId,
    String clientName,
    BigDecimal amount,
    String currency,
    String method,
    OffsetDateTime paidAt,
    String reference,
    BigDecimal stripeFeeAmount,
    BigDecimal netAmount
) {
}
