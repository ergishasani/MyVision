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

public record InvoiceRequest(
    @NotNull
    UUID clientId,

    UUID projectId,

    InvoiceType type,

    LocalDate issueDate,
    LocalDate dueDate,

    /**
     * Date of supply, or the period it covers. Sec. 14 UStG requires one of them; the editor
     * sends a date by default and a period when the operator switches to one.
     */
    LocalDate deliveryDate,
    LocalDate servicePeriodStart,
    LocalDate servicePeriodEnd,

    @Size(max = 255) String subject,
    @Size(max = 100) String reference,

    /** Defaults to a plain domestic taxable supply when the caller says nothing. */
    InvoiceTaxScheme taxScheme,

    PaymentMethod paymentMethod,
    @Size(min = 2, max = 2) String language,
    UUID costCenterId,
    UUID contactPersonUserId,

    @PositiveOrZero Integer skontoDays,
    @PositiveOrZero BigDecimal skontoPercent,

    /** XRechnung mode. Makes the recipient email mandatory. */
    Boolean eInvoice,

    /** Issue under the company name, or the owner's own. Absent means the company name. */
    Boolean showCompanyName,
    @Size(max = 255) String recipientEmail,

    /** Overrides for the printed address. Left null, the contact's own is copied in. */
    @Size(max = 255) String recipientName,
    @Size(max = 255) String recipientAddressLine1,
    @Size(max = 255) String recipientAddressLine2,
    @Size(max = 20) String recipientPostalCode,
    @Size(max = 120) String recipientCity,
    @Size(min = 2, max = 2) String recipientCountryCode,

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
