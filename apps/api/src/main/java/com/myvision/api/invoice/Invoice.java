package com.myvision.api.invoice;

import com.myvision.api.common.BaseEntity;
import com.myvision.api.common.LowercaseLabelEnumJdbcType;
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

  private String notes;
  private String terms;
  private OffsetDateTime sentAt;
  private OffsetDateTime paidAt;
  private OffsetDateTime cancelledAt;

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
}
