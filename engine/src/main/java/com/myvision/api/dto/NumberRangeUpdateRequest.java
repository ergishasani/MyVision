package com.myvision.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Partial update of a numbering counter.
 *
 * <p>{@code nextNumber} may only be raised. The service rejects a lower value: the number has
 * already gone out on a document, and reissuing it is a compliance problem rather than a
 * preference.
 */
public record NumberRangeUpdateRequest(
    @Size(min = 1, max = 64) String format,
    @Min(0) @Max(12) Integer padding,
    @Positive Integer nextNumber
) {
}
