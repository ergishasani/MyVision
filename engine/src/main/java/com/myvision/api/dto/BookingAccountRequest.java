package com.myvision.api.dto;

import jakarta.validation.constraints.Size;

/** Create or update a booking account. */
public record BookingAccountRequest(
    @Size(max = 200) String displayName,
    @Size(max = 200) String name,
    @Size(max = 32) String skrAccount
) {
}
