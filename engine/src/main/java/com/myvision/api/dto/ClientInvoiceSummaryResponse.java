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

/**
 * One invoice as it appears in a contact's billing history.
 *
 * <p>Deliberately not {@link InvoiceResponse}: that record carries the line items, which would
 * mean a query per invoice to render a list nobody has expanded yet. Everything a history row
 * shows is on the invoice itself.
 */
public record ClientInvoiceSummaryResponse(
    UUID id,
    UUID projectId,
    String invoiceNumber,
    String status,
    LocalDate issueDate,
    LocalDate dueDate,
    String currency,
    BigDecimal totalAmount,
    BigDecimal amountPaid,
    BigDecimal balanceDue,
    OffsetDateTime sentAt,
    OffsetDateTime paidAt
) {

  public static ClientInvoiceSummaryResponse from(Invoice invoice) {
    return new ClientInvoiceSummaryResponse(
        invoice.getId(),
        invoice.getProjectId(),
        invoice.getInvoiceNumber(),
        invoice.getStatus().name(),
        invoice.getIssueDate(),
        invoice.getDueDate(),
        invoice.getCurrency(),
        invoice.getTotalAmount(),
        invoice.getAmountPaid(),
        invoice.getBalanceDue(),
        invoice.getSentAt(),
        invoice.getPaidAt()
    );
  }
}
