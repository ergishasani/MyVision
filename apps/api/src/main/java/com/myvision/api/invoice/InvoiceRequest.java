package com.myvision.api.invoice;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record InvoiceRequest(
    @NotNull
    UUID clientId,

    UUID projectId,

    InvoiceType type,

    LocalDate issueDate,
    LocalDate dueDate,

    @Size(min = 3, max = 3)
    String currency,

    @PositiveOrZero
    BigDecimal discountAmount,

    @Size(max = 5000)
    String notes,

    @Size(max = 5000)
    String terms,

    @NotEmpty
    @Valid
    List<InvoiceItemRequest> items
) {
}
