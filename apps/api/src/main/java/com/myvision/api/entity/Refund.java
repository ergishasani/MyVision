package com.myvision.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Money returned to a payer against an invoice.
 *
 * <p>Kept as its own record rather than a negative {@link Payment} so "what was collected" and
 * "what was given back" stay separately answerable — which is what an accountant will ask for, and
 * what keeps the payments table meaning exactly one thing.
 *
 * <p>Does not extend BaseEntity: the refunds table has no updated_at column.
 */
@Entity
@Table(name = "refunds")
public class Refund {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Column(name = "invoice_id", nullable = false, updatable = false)
  private UUID invoiceId;

  /** Null when a dashboard-issued refund cannot be tied to one stored payment. */
  @Column(name = "payment_id")
  private UUID paymentId;

  @Column(nullable = false)
  private BigDecimal amount;

  // char(3) in the schema, matching payments.currency.
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 3)
  private String currency = "EUR";

  private String reason;

  @Column(nullable = false)
  private String status = "pending";

  @Column(name = "stripe_refund_id")
  private String stripeRefundId;

  @Column(name = "created_at", nullable = false, updatable = false)
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

  public UUID getPaymentId() {
    return paymentId;
  }

  public void setPaymentId(UUID paymentId) {
    this.paymentId = paymentId;
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

  public String getReason() {
    return reason;
  }

  public void setReason(String reason) {
    this.reason = reason;
  }

  public String getStatus() {
    return status;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public String getStripeRefundId() {
    return stripeRefundId;
  }

  public void setStripeRefundId(String stripeRefundId) {
    this.stripeRefundId = stripeRefundId;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(OffsetDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
