package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentResponse(
    UUID id,
    UUID invoiceId,
    BigDecimal amount,
    String currency,
    String method,
    OffsetDateTime paidAt,
    String reference,
    String notes,
    BigDecimal stripeFeeAmount,
    BigDecimal netAmount,
    OffsetDateTime createdAt
) {

  public static PaymentResponse from(Payment payment) {
    return new PaymentResponse(
        payment.getId(),
        payment.getInvoiceId(),
        payment.getAmount(),
        payment.getCurrency(),
        payment.getMethod().name(),
        payment.getPaidAt(),
        payment.getReference(),
        payment.getNotes(),
        payment.getStripeFeeAmount(),
        payment.getNetAmount(),
        payment.getCreatedAt()
    );
  }
}
