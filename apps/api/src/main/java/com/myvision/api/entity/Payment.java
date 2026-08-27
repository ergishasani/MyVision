package com.myvision.api.entity;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;
import org.hibernate.type.SqlTypes;

// Does not extend BaseEntity: payments has no updated_at column.
@Entity
@Table(name = "payments")
public class Payment {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Column(name = "invoice_id", nullable = false, updatable = false)
  private UUID invoiceId;

  @Column(nullable = false)
  private BigDecimal amount;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 3)
  private String currency = "EUR";

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "payment_method")
  private PaymentMethod method = PaymentMethod.bank_transfer;

  @Column(nullable = false)
  private OffsetDateTime paidAt = OffsetDateTime.now();

  private String reference;
  private String notes;

  @Column(name = "stripe_payment_intent_id")
  private String stripePaymentIntentId;

  @Column(name = "stripe_checkout_session_id")
  private String stripeCheckoutSessionId;

  /** Stripe's cut. Null when the balance transaction could not be read. */
  @Column(name = "stripe_fee_amount")
  private BigDecimal stripeFeeAmount;

  /** amount minus stripeFeeAmount. Null whenever the fee is null. */
  @Column(name = "net_amount")
  private BigDecimal netAmount;

  @Column(nullable = false, updatable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public UUID getInvoiceId() {
    return invoiceId;
  }

  public void setInvoiceId(UUID invoiceId) {
    this.invoiceId = invoiceId;
  }

  public BigDecimal getAmount() {
    return amount;
  }

  public void setAmount(BigDecimal amount) {
    this.amount = amount;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public PaymentMethod getMethod() {
    return method;
  }

  public void setMethod(PaymentMethod method) {
    this.method = method;
  }

  public OffsetDateTime getPaidAt() {
    return paidAt;
  }

  public void setPaidAt(OffsetDateTime paidAt) {
    this.paidAt = paidAt;
  }

  public String getReference() {
    return reference;
  }

  public void setReference(String reference) {
    this.reference = reference;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public String getStripePaymentIntentId() {
    return stripePaymentIntentId;
  }

  public void setStripePaymentIntentId(String stripePaymentIntentId) {
    this.stripePaymentIntentId = stripePaymentIntentId;
  }

  public String getStripeCheckoutSessionId() {
    return stripeCheckoutSessionId;
  }

  public void setStripeCheckoutSessionId(String stripeCheckoutSessionId) {
    this.stripeCheckoutSessionId = stripeCheckoutSessionId;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(OffsetDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public BigDecimal getStripeFeeAmount() {
    return stripeFeeAmount;
  }

  public void setStripeFeeAmount(BigDecimal stripeFeeAmount) {
    this.stripeFeeAmount = stripeFeeAmount;
  }

  public BigDecimal getNetAmount() {
    return netAmount;
  }

  public void setNetAmount(BigDecimal netAmount) {
    this.netAmount = netAmount;
  }
}
