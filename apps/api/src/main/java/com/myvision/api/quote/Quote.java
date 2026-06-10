package com.myvision.api.quote;

import com.myvision.api.common.BaseEntity;
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
@Table(name = "quotes")
public class Quote extends BaseEntity {

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Column(name = "client_id", nullable = false)
  private UUID clientId;

  @Column(name = "project_id")
  private UUID projectId;

  @Column(nullable = false)
  private String quoteNumber;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "quote_status")
  private QuoteStatus status = QuoteStatus.draft;

  @Column(nullable = false)
  private LocalDate issueDate = LocalDate.now();

  private LocalDate validUntil;

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

  private String notes;
  private String terms;
  private OffsetDateTime sentAt;
  private OffsetDateTime acceptedAt;
  private OffsetDateTime rejectedAt;

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

  public String getQuoteNumber() {
    return quoteNumber;
  }

  public void setQuoteNumber(String quoteNumber) {
    this.quoteNumber = quoteNumber;
  }

  public QuoteStatus getStatus() {
    return status;
  }

  public void setStatus(QuoteStatus status) {
    this.status = status;
  }

  public LocalDate getIssueDate() {
    return issueDate;
  }

  public void setIssueDate(LocalDate issueDate) {
    this.issueDate = issueDate;
  }

  public LocalDate getValidUntil() {
    return validUntil;
  }

  public void setValidUntil(LocalDate validUntil) {
    this.validUntil = validUntil;
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

  public OffsetDateTime getAcceptedAt() {
    return acceptedAt;
  }

  public void setAcceptedAt(OffsetDateTime acceptedAt) {
    this.acceptedAt = acceptedAt;
  }

  public OffsetDateTime getRejectedAt() {
    return rejectedAt;
  }

  public void setRejectedAt(OffsetDateTime rejectedAt) {
    this.rejectedAt = rejectedAt;
  }
}
