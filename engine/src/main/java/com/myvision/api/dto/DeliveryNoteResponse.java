package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record DeliveryNoteResponse(
    UUID id,
    UUID clientId,
    UUID projectId,
    UUID invoiceId,
    UUID quoteId,
    String deliveryNoteNumber,
    String status,
    String subject,
    LocalDate deliveryDate,
    String reference,
    String deliveryAddressLine1,
    String deliveryAddressLine2,
    String deliveryPostalCode,
    String deliveryCity,
    String deliveryRegion,
    String deliveryCountryCode,
    String currency,
    BigDecimal subtotalAmount,
    BigDecimal discountAmount,
    BigDecimal taxAmount,
    BigDecimal totalAmount,
    String headerText,
    String footerText,
    OffsetDateTime sentAt,
    OffsetDateTime deliveredAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    List<DeliveryNoteItemResponse> items
) {

  public static DeliveryNoteResponse from(DeliveryNote note, List<DeliveryNoteItem> items) {
    return new DeliveryNoteResponse(
        note.getId(),
        note.getClientId(),
        note.getProjectId(),
        note.getInvoiceId(),
        note.getQuoteId(),
        note.getDeliveryNoteNumber(),
        note.getStatus().name(),
        note.getSubject(),
        note.getDeliveryDate(),
        note.getReference(),
        note.getDeliveryAddressLine1(),
        note.getDeliveryAddressLine2(),
        note.getDeliveryPostalCode(),
        note.getDeliveryCity(),
        note.getDeliveryRegion(),
        note.getDeliveryCountryCode(),
        note.getCurrency(),
        note.getSubtotalAmount(),
        note.getDiscountAmount(),
        note.getTaxAmount(),
        note.getTotalAmount(),
        note.getHeaderText(),
        note.getFooterText(),
        note.getSentAt(),
        note.getDeliveredAt(),
        note.getCreatedAt(),
        note.getUpdatedAt(),
        items.stream().map(DeliveryNoteItemResponse::from).toList()
    );
  }
}
