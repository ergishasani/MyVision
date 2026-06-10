package com.myvision.api.invoice;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record InvoiceResponse(
    UUID id,
    UUID clientId,
    UUID projectId,
    UUID sourceQuoteId,
    String invoiceNumber,
    String type,
    String status,
    LocalDate issueDate,
    LocalDate dueDate,
    String currency,
    BigDecimal subtotalAmount,
    BigDecimal discountAmount,
    BigDecimal taxAmount,
    BigDecimal totalAmount,
    BigDecimal amountPaid,
    BigDecimal balanceDue,
    String notes,
    String terms,
    OffsetDateTime sentAt,
    OffsetDateTime paidAt,
    OffsetDateTime cancelledAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt,
    List<InvoiceItemResponse> items
) {

  public static InvoiceResponse from(Invoice invoice, List<InvoiceItem> items) {
    return new InvoiceResponse(
        invoice.getId(),
        invoice.getClientId(),
        invoice.getProjectId(),
        invoice.getSourceQuoteId(),
        invoice.getInvoiceNumber(),
        invoice.getType().name(),
        invoice.getStatus().name(),
        invoice.getIssueDate(),
        invoice.getDueDate(),
        invoice.getCurrency(),
        invoice.getSubtotalAmount(),
        invoice.getDiscountAmount(),
        invoice.getTaxAmount(),
        invoice.getTotalAmount(),
        invoice.getAmountPaid(),
        invoice.getBalanceDue(),
        invoice.getNotes(),
        invoice.getTerms(),
        invoice.getSentAt(),
        invoice.getPaidAt(),
        invoice.getCancelledAt(),
        invoice.getCreatedAt(),
        invoice.getUpdatedAt(),
        items.stream().map(InvoiceItemResponse::from).toList()
    );
  }
}
