package com.myvision.api.dto;

import com.myvision.api.entity.ProductCategory;
import com.myvision.api.entity.ProductUnitCode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;

/**
 * A new product.
 *
 * <p>Prices may be given net or gross. Only net is stored, so if both are sent the net figure is
 * the one kept; the gross fields exist so a caller can work in whichever figure it has.
 */
public record ProductRequest(
    @NotBlank
    @Size(max = 200)
    String name,

    @Positive
    Integer articleNumber,

    ProductCategory category,

    ProductUnitCode unit,

    @DecimalMin("0.00")
    @DecimalMax("100.00")
    BigDecimal taxRate,

    @PositiveOrZero
    BigDecimal sellingPriceNet,

    @PositiveOrZero
    BigDecimal sellingPriceGross,

    @PositiveOrZero
    BigDecimal purchasePriceNet,

    @PositiveOrZero
    BigDecimal purchasePriceGross,

    @Size(max = 5000)
    String description,

    @Size(max = 5000)
    String internalNote,

    Boolean inventoryEnabled,

    @Valid
    List<ProductUnitInput> units
) {
}
