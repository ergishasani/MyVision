package com.myvision.api.quote;

import com.myvision.api.common.LineItemKind;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record QuoteItemRequest(
    LineItemKind kind,

    @NotBlank
    @Size(max = 1000)
    String description,

    @NotNull
    @Positive
    BigDecimal quantity,

    @Size(max = 20)
    String unit,

    @NotNull
    @PositiveOrZero
    BigDecimal unitPrice,

    @PositiveOrZero
    BigDecimal taxRate,

    @PositiveOrZero
    BigDecimal discountAmount
) {
}
