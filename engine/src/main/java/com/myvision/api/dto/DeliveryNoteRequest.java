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

public record DeliveryNoteRequest(
    @NotNull
    UUID clientId,

    UUID projectId,

    /** Set when the note is raised off an existing document, so the two stay linked. */
    UUID invoiceId,
    UUID quoteId,

    @Size(max = 255)
    String subject,

    LocalDate deliveryDate,

    @Size(max = 100)
    String reference,

    /** Where the goods go. Left null, the contact's own address is copied in. */
    @Size(max = 255) String deliveryAddressLine1,
    @Size(max = 255) String deliveryAddressLine2,
    @Size(max = 20) String deliveryPostalCode,
    @Size(max = 120) String deliveryCity,
    @Size(max = 120) String deliveryRegion,
    @Size(min = 2, max = 2) String deliveryCountryCode,

    @Size(min = 3, max = 3)
    String currency,

    @PositiveOrZero
    BigDecimal discountAmount,

    @Size(max = 5000) String headerText,
    @Size(max = 5000) String footerText,

    @NotEmpty
    @Valid
    List<DeliveryNoteItemRequest> items
) {
}
