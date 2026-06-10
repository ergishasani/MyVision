package com.myvision.api.invoice;

import java.math.BigDecimal;
import java.util.UUID;

public record InvoiceItemResponse(
    UUID id,
    Integer position,
    String kind,
    String description,
    BigDecimal quantity,
    String unit,
    BigDecimal unitPrice,
    BigDecimal taxRate,
    BigDecimal discountAmount,
    BigDecimal lineTotal
) {

  public static InvoiceItemResponse from(InvoiceItem item) {
    return new InvoiceItemResponse(
        item.getId(),
        item.getPosition(),
        item.getKind().name(),
        item.getDescription(),
        item.getQuantity(),
        item.getUnit(),
        item.getUnitPrice(),
        item.getTaxRate(),
        item.getDiscountAmount(),
        item.getLineTotal()
    );
  }
}
