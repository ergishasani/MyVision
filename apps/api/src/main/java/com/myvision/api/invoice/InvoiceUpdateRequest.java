package com.myvision.api.invoice;

import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Partial update for a draft invoice: only non-null fields are applied.
 * If items are provided, all existing items are replaced.
 */
public record InvoiceUpdateRequest(
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

    @Valid
    List<InvoiceItemRequest> items
) {
}
