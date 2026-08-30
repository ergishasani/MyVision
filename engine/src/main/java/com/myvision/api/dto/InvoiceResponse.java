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
    LocalDate deliveryDate,
    LocalDate servicePeriodStart,
    LocalDate servicePeriodEnd,
    String subject,
    String reference,
    String taxScheme,
    String paymentMethod,
    String language,
    UUID costCenterId,
    UUID contactPersonUserId,
    Integer skontoDays,
    BigDecimal skontoPercent,
    boolean eInvoice,
    boolean showCompanyName,
    String recipientEmail,
    String recipientName,
    String recipientAddressLine1,
    String recipientAddressLine2,
    String recipientPostalCode,
    String recipientCity,
    String recipientCountryCode,
    String currency,
    BigDecimal subtotalAmount,
    BigDecimal discountAmount,
    BigDecimal taxAmount,
    BigDecimal totalAmount,
    BigDecimal amountPaid,
    BigDecimal balanceDue,
    List<String> tags,
    String notes,
    String terms,
    OffsetDateTime sentAt,
    OffsetDateTime paidAt,
    OffsetDateTime cancelledAt,
    String lastPaymentError,
    OffsetDateTime lastPaymentErrorAt,
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
        invoice.getDeliveryDate(),
        invoice.getServicePeriodStart(),
        invoice.getServicePeriodEnd(),
        invoice.getSubject(),
        invoice.getReference(),
        invoice.getTaxScheme().name(),
        invoice.getPaymentMethod().name(),
        invoice.getLanguage(),
        invoice.getCostCenterId(),
        invoice.getContactPersonUserId(),
        invoice.getSkontoDays(),
        invoice.getSkontoPercent(),
        invoice.isEInvoice(),
        invoice.isShowCompanyName(),
        invoice.getRecipientEmail(),
        invoice.getRecipientName(),
        invoice.getRecipientAddressLine1(),
        invoice.getRecipientAddressLine2(),
        invoice.getRecipientPostalCode(),
        invoice.getRecipientCity(),
        invoice.getRecipientCountryCode(),
        invoice.getCurrency(),
        invoice.getSubtotalAmount(),
        invoice.getDiscountAmount(),
        invoice.getTaxAmount(),
        invoice.getTotalAmount(),
        invoice.getAmountPaid(),
        invoice.getBalanceDue(),
        List.of(invoice.getTags()),
        invoice.getNotes(),
        invoice.getTerms(),
        invoice.getSentAt(),
        invoice.getPaidAt(),
        invoice.getCancelledAt(),
        invoice.getLastPaymentError(),
        invoice.getLastPaymentErrorAt(),
        invoice.getCreatedAt(),
        invoice.getUpdatedAt(),
        items.stream().map(InvoiceItemResponse::from).toList()
    );
  }
}
