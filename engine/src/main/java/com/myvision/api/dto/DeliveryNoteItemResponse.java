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

public record DeliveryNoteItemResponse(
    UUID id,
    String kind,
    String description,
    BigDecimal quantity,
    String unit,
    BigDecimal unitPrice,
    BigDecimal taxRate,
    BigDecimal discountAmount,
    BigDecimal lineTotal,
    Integer position
) {

  public static DeliveryNoteItemResponse from(DeliveryNoteItem item) {
    return new DeliveryNoteItemResponse(
        item.getId(),
        item.getKind().name(),
        item.getDescription(),
        item.getQuantity(),
        item.getUnit(),
        item.getUnitPrice(),
        item.getTaxRate(),
        item.getDiscountAmount(),
        item.getLineTotal(),
        item.getPosition()
    );
  }
}
