package com.myvision.api.dto;

import jakarta.validation.constraints.Size;

/** Create or update a cost centre. */
public record CostCenterRequest(
    @Size(max = 200) String name,
    @Size(max = 32) String number
) {
}
