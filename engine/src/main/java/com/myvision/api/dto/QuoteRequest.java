package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record QuoteRequest(
    @NotNull
    UUID clientId,

    UUID projectId,

    LocalDate issueDate,
    LocalDate validUntil,

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
    List<QuoteItemRequest> items
) {
}
