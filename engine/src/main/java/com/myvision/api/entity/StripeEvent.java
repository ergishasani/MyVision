package com.myvision.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * A Stripe webhook event this instance has already acted on.
 *
 * <p>Stripe redelivers an event until it receives a 2xx, so the same event can arrive several
 * times. The primary key is Stripe's own event id, which makes "have I handled this?" a single
 * lookup and makes double-applying a payment impossible.
 */
@Entity
@Table(name = "stripe_events")
public class StripeEvent {

  @Id
  private String id;

  @Column(nullable = false)
  private String type;

  @Column(name = "company_id")
  private UUID companyId;

  @Column(name = "invoice_id")
  private UUID invoiceId;

  @Column(name = "processed_at", nullable = false)
  private OffsetDateTime processedAt = OffsetDateTime.now();

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getType() {
    return type;
  }

  public void setType(String type) {
    this.type = type;
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

  public OffsetDateTime getProcessedAt() {
    return processedAt;
  }

  public void setProcessedAt(OffsetDateTime processedAt) {
    this.processedAt = processedAt;
  }
}
