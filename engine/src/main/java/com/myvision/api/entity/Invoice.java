package com.myvision.api.entity;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.entity.BaseEntity;
import com.myvision.api.util.LowercaseLabelEnumJdbcType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "invoices")
public class Invoice extends BaseEntity {

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Column(name = "client_id", nullable = false)
  private UUID clientId;

  @Column(name = "project_id")
  private UUID projectId;

  @Column(name = "source_quote_id")
  private UUID sourceQuoteId;

  @Column(nullable = false)
  private String invoiceNumber;

  @Enumerated(EnumType.STRING)
  @JdbcType(LowercaseLabelEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "invoice_type")
  private InvoiceType type = InvoiceType.STANDARD;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "invoice_status")
  private InvoiceStatus status = InvoiceStatus.draft;

  @Column(nullable = false)
  private LocalDate issueDate = LocalDate.now();

  private LocalDate dueDate;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 3)
  private String currency = "EUR";

  @Column(nullable = false)
  private BigDecimal subtotalAmount = BigDecimal.ZERO;

  @Column(nullable = false)
  private BigDecimal discountAmount = BigDecimal.ZERO;

  @Column(nullable = false)
  private BigDecimal taxAmount = BigDecimal.ZERO;

  @Column(nullable = false)
  private BigDecimal totalAmount = BigDecimal.ZERO;

  @Column(nullable = false)
  private BigDecimal amountPaid = BigDecimal.ZERO;

  @Column(nullable = false)
  private BigDecimal balanceDue = BigDecimal.ZERO;

  /**
   * The date of supply, or the period it covers.
   *
   * <p>Sec. 14 UStG requires one of these on an invoice. Nullable only because rows written
   * before the column existed cannot have it; anything issued from the editor carries it.
   */
  private LocalDate deliveryDate;

  private LocalDate servicePeriodStart;
  private LocalDate servicePeriodEnd;

  private String subject;
  private String reference;

  /** Drives the VAT note the document has to print. */
  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "invoice_tax_scheme")
  private InvoiceTaxScheme taxScheme = InvoiceTaxScheme.domestic_taxable;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "payment_method")
  private PaymentMethod paymentMethod = PaymentMethod.bank_transfer;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 2)
  private String language = "de";

  @Column(name = "cost_center_id")
  private UUID costCenterId;

  @Column(name = "contact_person_user_id")
  private UUID contactPersonUserId;

  private Integer skontoDays;
  private BigDecimal skontoPercent;

  /** XRechnung mode. Makes the recipient and their email mandatory. */
  @Column(nullable = false)
  private boolean eInvoice = false;

  /**
   * Whether the document is issued under the company name or the owner's own.
   *
   * <p>The supplier's name itself is not optional: turning this off swaps the company name for the
   * account owner's, so a sole trader can invoice as a person without dropping a required field.
   */
  @Column(nullable = false)
  private boolean showCompanyName = true;

  private String recipientEmail;

  /**
   * The recipient as printed on the document.
   *
   * <p>A snapshot taken when the invoice is raised, not a live lookup. The invoice has to keep
   * the name and address it was issued to even after the contact moves — the same rule that stops
   * an invoiced contact being deleted.
   */
  private String recipientName;

  private String recipientAddressLine1;
  private String recipientAddressLine2;
  private String recipientPostalCode;
  private String recipientCity;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(length = 2)
  private String recipientCountryCode;

  /**
   * The operator's own filing labels.
   *
   * <p>Not part of the document, so unlike everything else here they stay editable after the
   * invoice is issued — filing something is usually something you want to do afterwards.
   */
  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(columnDefinition = "text[]", nullable = false)
  private String[] tags = new String[0];

  private String notes;
  private String terms;
  private OffsetDateTime sentAt;
  private OffsetDateTime paidAt;
  private OffsetDateTime cancelledAt;

  @Column(name = "stripe_checkout_session_id")
  private String stripeCheckoutSessionId;

  @Column(name = "stripe_payment_intent_id")
  private String stripePaymentIntentId;

  @Column(name = "last_payment_error")
  private String lastPaymentError;

  @Column(name = "last_payment_error_at")
  private OffsetDateTime lastPaymentErrorAt;

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public UUID getClientId() {
    return clientId;
  }

  public void setClientId(UUID clientId) {
    this.clientId = clientId;
  }

  public UUID getProjectId() {
    return projectId;
  }

  public void setProjectId(UUID projectId) {
    this.projectId = projectId;
  }

  public UUID getSourceQuoteId() {
    return sourceQuoteId;
  }

  public void setSourceQuoteId(UUID sourceQuoteId) {
    this.sourceQuoteId = sourceQuoteId;
  }

  public String getInvoiceNumber() {
    return invoiceNumber;
  }

  public void setInvoiceNumber(String invoiceNumber) {
    this.invoiceNumber = invoiceNumber;
  }

  public InvoiceType getType() {
    return type;
  }

  public void setType(InvoiceType type) {
    this.type = type;
  }

  public InvoiceStatus getStatus() {
    return status;
  }

  public void setStatus(InvoiceStatus status) {
    this.status = status;
  }

  public LocalDate getIssueDate() {
    return issueDate;
  }

  public void setIssueDate(LocalDate issueDate) {
    this.issueDate = issueDate;
  }

  public LocalDate getDueDate() {
    return dueDate;
  }

  public void setDueDate(LocalDate dueDate) {
    this.dueDate = dueDate;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public BigDecimal getSubtotalAmount() {
    return subtotalAmount;
  }

  public void setSubtotalAmount(BigDecimal subtotalAmount) {
    this.subtotalAmount = subtotalAmount;
  }

  public BigDecimal getDiscountAmount() {
    return discountAmount;
  }

  public void setDiscountAmount(BigDecimal discountAmount) {
    this.discountAmount = discountAmount;
  }

  public BigDecimal getTaxAmount() {
    return taxAmount;
  }

  public void setTaxAmount(BigDecimal taxAmount) {
    this.taxAmount = taxAmount;
  }

  public BigDecimal getTotalAmount() {
    return totalAmount;
  }

  public void setTotalAmount(BigDecimal totalAmount) {
    this.totalAmount = totalAmount;
  }

  public BigDecimal getAmountPaid() {
    return amountPaid;
  }

  public void setAmountPaid(BigDecimal amountPaid) {
    this.amountPaid = amountPaid;
  }

  public BigDecimal getBalanceDue() {
    return balanceDue;
  }

  public void setBalanceDue(BigDecimal balanceDue) {
    this.balanceDue = balanceDue;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public String getTerms() {
    return terms;
  }

  public void setTerms(String terms) {
    this.terms = terms;
  }

  public OffsetDateTime getSentAt() {
    return sentAt;
  }

  public void setSentAt(OffsetDateTime sentAt) {
    this.sentAt = sentAt;
  }

  public OffsetDateTime getPaidAt() {
    return paidAt;
  }

  public void setPaidAt(OffsetDateTime paidAt) {
    this.paidAt = paidAt;
  }

  public OffsetDateTime getCancelledAt() {
    return cancelledAt;
  }

  public void setCancelledAt(OffsetDateTime cancelledAt) {
    this.cancelledAt = cancelledAt;
  }

  public String getStripeCheckoutSessionId() {
    return stripeCheckoutSessionId;
  }

  public void setStripeCheckoutSessionId(String stripeCheckoutSessionId) {
    this.stripeCheckoutSessionId = stripeCheckoutSessionId;
  }

  public String getStripePaymentIntentId() {
    return stripePaymentIntentId;
  }

  public void setStripePaymentIntentId(String stripePaymentIntentId) {
    this.stripePaymentIntentId = stripePaymentIntentId;
  }

  public String getLastPaymentError() {
    return lastPaymentError;
  }

  public void setLastPaymentError(String lastPaymentError) {
    this.lastPaymentError = lastPaymentError;
  }

  public OffsetDateTime getLastPaymentErrorAt() {
    return lastPaymentErrorAt;
  }

  public void setLastPaymentErrorAt(OffsetDateTime lastPaymentErrorAt) {
    this.lastPaymentErrorAt = lastPaymentErrorAt;
  }

  public LocalDate getDeliveryDate() {
    return deliveryDate;
  }

  public void setDeliveryDate(LocalDate deliveryDate) {
    this.deliveryDate = deliveryDate;
  }

  public LocalDate getServicePeriodStart() {
    return servicePeriodStart;
  }

  public void setServicePeriodStart(LocalDate servicePeriodStart) {
    this.servicePeriodStart = servicePeriodStart;
  }

  public LocalDate getServicePeriodEnd() {
    return servicePeriodEnd;
  }

  public void setServicePeriodEnd(LocalDate servicePeriodEnd) {
    this.servicePeriodEnd = servicePeriodEnd;
  }

  public String getSubject() {
    return subject;
  }

  public void setSubject(String subject) {
    this.subject = subject;
  }

  public String getReference() {
    return reference;
  }

  public void setReference(String reference) {
    this.reference = reference;
  }

  public InvoiceTaxScheme getTaxScheme() {
    return taxScheme;
  }

  public void setTaxScheme(InvoiceTaxScheme taxScheme) {
    this.taxScheme = taxScheme;
  }

  public PaymentMethod getPaymentMethod() {
    return paymentMethod;
  }

  public void setPaymentMethod(PaymentMethod paymentMethod) {
    this.paymentMethod = paymentMethod;
  }

  public String getLanguage() {
    return language;
  }

  public void setLanguage(String language) {
    this.language = language;
  }

  public UUID getCostCenterId() {
    return costCenterId;
  }

  public void setCostCenterId(UUID costCenterId) {
    this.costCenterId = costCenterId;
  }

  public UUID getContactPersonUserId() {
    return contactPersonUserId;
  }

  public void setContactPersonUserId(UUID contactPersonUserId) {
    this.contactPersonUserId = contactPersonUserId;
  }

  public Integer getSkontoDays() {
    return skontoDays;
  }

  public void setSkontoDays(Integer skontoDays) {
    this.skontoDays = skontoDays;
  }

  public BigDecimal getSkontoPercent() {
    return skontoPercent;
  }

  public void setSkontoPercent(BigDecimal skontoPercent) {
    this.skontoPercent = skontoPercent;
  }

  public String getRecipientEmail() {
    return recipientEmail;
  }

  public void setRecipientEmail(String recipientEmail) {
    this.recipientEmail = recipientEmail;
  }

  public String getRecipientName() {
    return recipientName;
  }

  public void setRecipientName(String recipientName) {
    this.recipientName = recipientName;
  }

  public String getRecipientAddressLine1() {
    return recipientAddressLine1;
  }

  public void setRecipientAddressLine1(String recipientAddressLine1) {
    this.recipientAddressLine1 = recipientAddressLine1;
  }

  public String getRecipientAddressLine2() {
    return recipientAddressLine2;
  }

  public void setRecipientAddressLine2(String recipientAddressLine2) {
    this.recipientAddressLine2 = recipientAddressLine2;
  }

  public String getRecipientPostalCode() {
    return recipientPostalCode;
  }

  public void setRecipientPostalCode(String recipientPostalCode) {
    this.recipientPostalCode = recipientPostalCode;
  }

  public String getRecipientCity() {
    return recipientCity;
  }

  public void setRecipientCity(String recipientCity) {
    this.recipientCity = recipientCity;
  }

  public String getRecipientCountryCode() {
    return recipientCountryCode;
  }

  public void setRecipientCountryCode(String recipientCountryCode) {
    this.recipientCountryCode = recipientCountryCode;
  }

  public boolean isEInvoice() {
    return eInvoice;
  }

  public void setEInvoice(boolean eInvoice) {
    this.eInvoice = eInvoice;
  }

  public boolean isShowCompanyName() {
    return showCompanyName;
  }

  public void setShowCompanyName(boolean showCompanyName) {
    this.showCompanyName = showCompanyName;
  }

  public String[] getTags() {
    return tags;
  }

  public void setTags(String[] tags) {
    this.tags = tags == null ? new String[0] : tags;
  }
}
