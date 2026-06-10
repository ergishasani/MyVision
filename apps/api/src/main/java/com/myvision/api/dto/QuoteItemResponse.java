package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;
import java.util.UUID;

public record QuoteItemResponse(
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

  public static QuoteItemResponse from(QuoteItem item) {
    return new QuoteItemResponse(
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
