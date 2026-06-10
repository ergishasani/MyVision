package com.myvision.api.client;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

/** Partial update: only non-null fields are applied. */
public record ClientUpdateRequest(
    ClientType type,

    @Size(min = 1, max = 200)
    String name,

    @Size(max = 160)
    String contactName,

    @Email
    @Size(max = 255)
    String email,

    @Size(max = 50)
    String phone,

    @Size(max = 50)
    String vatNumber,

    @Size(max = 255)
    String addressLine1,

    @Size(max = 255)
    String addressLine2,

    @Size(max = 120)
    String city,

    @Size(max = 120)
    String region,

    @Size(max = 20)
    String postalCode,

    @Size(min = 2, max = 2)
    String countryCode,

    @Size(max = 5000)
    String notes
) {
}
