package com.myvision.api.dto;

import com.myvision.api.entity.ProductUnit;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * An alternative unit, with the price it works out to.
 *
 * <p>{@code priceNet} is computed on read rather than stored, so it can never contradict the
 * product's own price.
 */
public record ProductUnitResponse(
    UUID id,
    String unit,
    BigDecimal factor,
    BigDecimal priceNet
) {

  public static ProductUnitResponse from(ProductUnit unit, BigDecimal sellingPriceNet) {
    return new ProductUnitResponse(
        unit.getId(),
        unit.getUnit().name(),
        unit.getFactor(),
        sellingPriceNet.multiply(unit.getFactor())
            .setScale(2, java.math.RoundingMode.HALF_UP)
    );
  }
}
