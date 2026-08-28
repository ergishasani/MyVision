package com.myvision.api.dto;

import com.myvision.api.entity.ProductUnitCode;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

/** One alternative unit on the create/update form. */
public record ProductUnitInput(
    @NotNull ProductUnitCode unit,

    // Exclusive: a factor of zero would make the derived price meaningless, and the DB rejects it.
    @NotNull
    @DecimalMin(value = "0", inclusive = false)
    BigDecimal factor
) {
}
