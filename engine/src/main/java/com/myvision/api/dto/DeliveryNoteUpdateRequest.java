package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import jakarta.validation.Valid;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** PATCH semantics: a null field means "unchanged", including the item list. */
public record DeliveryNoteUpdateRequest(
    UUID clientId,
    UUID projectId,
    @Size(max = 255) String subject,
    LocalDate deliveryDate,
    @Size(max = 100) String reference,

    @Size(max = 255) String deliveryAddressLine1,
    @Size(max = 255) String deliveryAddressLine2,
    @Size(max = 20) String deliveryPostalCode,
    @Size(max = 120) String deliveryCity,
    @Size(max = 120) String deliveryRegion,
    @Size(min = 2, max = 2) String deliveryCountryCode,

    @PositiveOrZero BigDecimal discountAmount,
    @Size(max = 5000) String headerText,
    @Size(max = 5000) String footerText,

    @Valid List<DeliveryNoteItemRequest> items
) {
}
