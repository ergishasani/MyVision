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
import java.util.UUID;

/** One quote as it appears in a contact's history. Line items are left to the quote screen. */
public record ClientQuoteSummaryResponse(
    UUID id,
    UUID projectId,
    String quoteNumber,
    String status,
    LocalDate issueDate,
    LocalDate validUntil,
    String currency,
    BigDecimal totalAmount,
    OffsetDateTime sentAt,
    OffsetDateTime acceptedAt
) {

  public static ClientQuoteSummaryResponse from(Quote quote) {
    return new ClientQuoteSummaryResponse(
        quote.getId(),
        quote.getProjectId(),
        quote.getQuoteNumber(),
        quote.getStatus().name(),
        quote.getIssueDate(),
        quote.getValidUntil(),
        quote.getCurrency(),
        quote.getTotalAmount(),
        quote.getSentAt(),
        quote.getAcceptedAt()
    );
  }
}
