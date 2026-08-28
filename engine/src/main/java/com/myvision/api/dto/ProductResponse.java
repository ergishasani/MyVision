package com.myvision.api.dto;

import com.myvision.api.entity.Product;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * A product as returned to clients.
 *
 * <p>The gross figures are derived from net and the tax rate on every read rather than stored.
 * That way there is exactly one price of record and the two can never disagree.
 */
public record ProductResponse(
    UUID id,
    Integer articleNumber,
    String name,
    String category,
    String unit,
    BigDecimal taxRate,
    BigDecimal sellingPriceNet,
    BigDecimal sellingPriceGross,
    BigDecimal purchasePriceNet,
    BigDecimal purchasePriceGross,
    String description,
    String internalNote,
    Boolean inventoryEnabled,
    List<ProductUnitResponse> units,
    OffsetDateTime archivedAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

  /** net * (1 + rate/100), rounded to the cent. Null in stays null out. */
  public static BigDecimal grossOf(BigDecimal net, BigDecimal taxRate) {
    if (net == null) {
      return null;
    }
    BigDecimal rate = taxRate != null ? taxRate : BigDecimal.ZERO;
    return net.multiply(BigDecimal.ONE.add(rate.movePointLeft(2)))
        .setScale(2, RoundingMode.HALF_UP);
  }

  public static ProductResponse from(Product product) {
    return from(product, List.of());
  }

  public static ProductResponse from(Product product, List<ProductUnitResponse> units) {
    return new ProductResponse(
        product.getId(),
        product.getArticleNumber(),
        product.getName(),
        product.getCategory().name(),
        product.getUnit().name(),
        product.getTaxRate(),
        product.getSellingPriceNet(),
        grossOf(product.getSellingPriceNet(), product.getTaxRate()),
        product.getPurchasePriceNet(),
        grossOf(product.getPurchasePriceNet(), product.getTaxRate()),
        product.getDescription(),
        product.getInternalNote(),
        product.getInventoryEnabled(),
        units,
        product.getArchivedAt(),
        product.getCreatedAt(),
        product.getUpdatedAt()
    );
  }
}
