package com.myvision.api.project;

import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

/** Partial update: only non-null fields are applied. */
public record ProjectUpdateRequest(
    UUID clientId,

    @Size(min = 1, max = 200)
    String name,

    @Size(max = 50)
    String code,

    ProjectStatus status,

    @Size(max = 255)
    String jobSiteAddressLine1,

    @Size(max = 255)
    String jobSiteAddressLine2,

    @Size(max = 120)
    String jobSiteCity,

    @Size(max = 120)
    String jobSiteRegion,

    @Size(max = 20)
    String jobSitePostalCode,

    @Size(min = 2, max = 2)
    String jobSiteCountryCode,

    LocalDate startDate,
    LocalDate endDate,

    @PositiveOrZero
    BigDecimal budgetAmount,

    @Size(min = 3, max = 3)
    String currency,

    @Size(max = 5000)
    String description
) {
}
