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

public record QuoteResponse(
    UUID id,
    UUID clientId,
    UUID projectId,
    String quoteNumber,
    String status,
    LocalDate issueDate,
    LocalDate validUntil,
    String currency,
    BigDecimal subtotalAmount,
    BigDecimal discountAmount,
    BigDecimal taxAmount,
    BigDecimal totalAmount,
    String notes,
    String terms,
    OffsetDateTime sentAt,
    OffsetDateTime acceptedAt,
    OffsetDateTime rejectedAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    List<QuoteItemResponse> items
) {

  public static QuoteResponse from(Quote quote, List<QuoteItem> items) {
    return new QuoteResponse(
        quote.getId(),
        quote.getClientId(),
        quote.getProjectId(),
        quote.getQuoteNumber(),
        quote.getStatus().name(),
        quote.getIssueDate(),
        quote.getValidUntil(),
        quote.getCurrency(),
        quote.getSubtotalAmount(),
        quote.getDiscountAmount(),
        quote.getTaxAmount(),
        quote.getTotalAmount(),
        quote.getNotes(),
        quote.getTerms(),
        quote.getSentAt(),
        quote.getAcceptedAt(),
        quote.getRejectedAt(),
        quote.getCreatedAt(),
        quote.getUpdatedAt(),
        items.stream().map(QuoteItemResponse::from).toList()
    );
  }
}
