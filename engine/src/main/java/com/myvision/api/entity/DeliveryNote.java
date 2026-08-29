package com.myvision.api.entity;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.entity.BaseEntity;
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

/**
 * A delivery note: what was handed over, and when.
 *
 * <p>Deliberately not an invoice. Nothing is owed because a delivery note exists and it never
 * turns into one; it is the record a customer is shown when they ask what actually arrived.
 * Amounts are carried because German delivery notes routinely restate them, but they are
 * descriptive here — no balance, no payment, no tax point.
 */
@Entity
@Table(name = "delivery_notes")
public class DeliveryNote extends BaseEntity {

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Column(name = "client_id", nullable = false)
  private UUID clientId;

  @Column(name = "project_id")
  private UUID projectId;

  /** The invoice or offer this note was raised from, when it was. Both optional. */
  @Column(name = "invoice_id")
  private UUID invoiceId;

  @Column(name = "quote_id")
  private UUID quoteId;

  @Column(nullable = false)
  private String deliveryNoteNumber;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "delivery_note_status")
  private DeliveryNoteStatus status = DeliveryNoteStatus.draft;

  private String subject;

  @Column(nullable = false)
  private LocalDate deliveryDate = LocalDate.now();

  private String reference;

  private String deliveryAddressLine1;
  private String deliveryAddressLine2;
  private String deliveryPostalCode;
  private String deliveryCity;
  private String deliveryRegion;
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(length = 2)
  private String deliveryCountryCode;

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

  private String headerText;
  private String footerText;

  private OffsetDateTime sentAt;
  private OffsetDateTime deliveredAt;

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

  public UUID getInvoiceId() {
    return invoiceId;
  }

  public void setInvoiceId(UUID invoiceId) {
    this.invoiceId = invoiceId;
  }

  public UUID getQuoteId() {
    return quoteId;
  }

  public void setQuoteId(UUID quoteId) {
    this.quoteId = quoteId;
  }

  public String getDeliveryNoteNumber() {
    return deliveryNoteNumber;
  }

  public void setDeliveryNoteNumber(String deliveryNoteNumber) {
    this.deliveryNoteNumber = deliveryNoteNumber;
  }

  public DeliveryNoteStatus getStatus() {
    return status;
  }

  public void setStatus(DeliveryNoteStatus status) {
    this.status = status;
  }

  public String getSubject() {
    return subject;
  }

  public void setSubject(String subject) {
    this.subject = subject;
  }

  public LocalDate getDeliveryDate() {
    return deliveryDate;
  }

  public void setDeliveryDate(LocalDate deliveryDate) {
    this.deliveryDate = deliveryDate;
  }

  public String getReference() {
    return reference;
  }

  public void setReference(String reference) {
    this.reference = reference;
  }

  public String getDeliveryAddressLine1() {
    return deliveryAddressLine1;
  }

  public void setDeliveryAddressLine1(String deliveryAddressLine1) {
    this.deliveryAddressLine1 = deliveryAddressLine1;
  }

  public String getDeliveryAddressLine2() {
    return deliveryAddressLine2;
  }

  public void setDeliveryAddressLine2(String deliveryAddressLine2) {
    this.deliveryAddressLine2 = deliveryAddressLine2;
  }

  public String getDeliveryPostalCode() {
    return deliveryPostalCode;
  }

  public void setDeliveryPostalCode(String deliveryPostalCode) {
    this.deliveryPostalCode = deliveryPostalCode;
  }

  public String getDeliveryCity() {
    return deliveryCity;
  }

  public void setDeliveryCity(String deliveryCity) {
    this.deliveryCity = deliveryCity;
  }

  public String getDeliveryRegion() {
    return deliveryRegion;
  }

  public void setDeliveryRegion(String deliveryRegion) {
    this.deliveryRegion = deliveryRegion;
  }

  public String getDeliveryCountryCode() {
    return deliveryCountryCode;
  }

  public void setDeliveryCountryCode(String deliveryCountryCode) {
    this.deliveryCountryCode = deliveryCountryCode;
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

  public String getHeaderText() {
    return headerText;
  }

  public void setHeaderText(String headerText) {
    this.headerText = headerText;
  }

  public String getFooterText() {
    return footerText;
  }

  public void setFooterText(String footerText) {
    this.footerText = footerText;
  }

  public OffsetDateTime getSentAt() {
    return sentAt;
  }

  public void setSentAt(OffsetDateTime sentAt) {
    this.sentAt = sentAt;
  }

  public OffsetDateTime getDeliveredAt() {
    return deliveredAt;
  }

  public void setDeliveredAt(OffsetDateTime deliveredAt) {
    this.deliveredAt = deliveredAt;
  }
}
