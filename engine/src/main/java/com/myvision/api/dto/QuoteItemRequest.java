package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.entity.LineItemKind;
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
