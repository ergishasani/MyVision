package com.myvision.api.payment;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record PaymentRequest(
    @NotNull
    @Positive
    BigDecimal amount,

    PaymentMethod method,

    OffsetDateTime paidAt,

    @Size(max = 255)
    String reference,

    @Size(max = 5000)
    String notes
) {
}
