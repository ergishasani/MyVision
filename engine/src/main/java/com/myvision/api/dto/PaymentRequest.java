package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

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
