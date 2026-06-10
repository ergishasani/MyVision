package com.myvision.api.entity;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.entity.LineItemKind;
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
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

// Does not extend BaseEntity: quote_items has no updated_at column.
@Entity
@Table(name = "quote_items")
public class QuoteItem {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "quote_id", nullable = false, updatable = false)
  private UUID quoteId;

  @Column(nullable = false)
  private Integer position;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "line_item_kind")
  private LineItemKind kind = LineItemKind.service;

  @Column(nullable = false)
  private String description;

  @Column(nullable = false)
  private BigDecimal quantity = BigDecimal.ONE;

  @Column(nullable = false)
  private String unit = "pcs";

  @Column(nullable = false)
  private BigDecimal unitPrice = BigDecimal.ZERO;

  @Column(nullable = false)
  private BigDecimal taxRate = BigDecimal.valueOf(19);

  @Column(nullable = false)
  private BigDecimal discountAmount = BigDecimal.ZERO;

  @Column(nullable = false)
  private BigDecimal lineTotal = BigDecimal.ZERO;

  @Column(nullable = false, updatable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getQuoteId() {
    return quoteId;
  }

  public void setQuoteId(UUID quoteId) {
    this.quoteId = quoteId;
  }

  public Integer getPosition() {
    return position;
  }

  public void setPosition(Integer position) {
    this.position = position;
  }

  public LineItemKind getKind() {
    return kind;
  }

  public void setKind(LineItemKind kind) {
    this.kind = kind;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public BigDecimal getQuantity() {
    return quantity;
  }

  public void setQuantity(BigDecimal quantity) {
    this.quantity = quantity;
  }

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
  }

  public BigDecimal getUnitPrice() {
    return unitPrice;
  }

  public void setUnitPrice(BigDecimal unitPrice) {
    this.unitPrice = unitPrice;
  }

  public BigDecimal getTaxRate() {
    return taxRate;
  }

  public void setTaxRate(BigDecimal taxRate) {
    this.taxRate = taxRate;
  }

  public BigDecimal getDiscountAmount() {
    return discountAmount;
  }

  public void setDiscountAmount(BigDecimal discountAmount) {
    this.discountAmount = discountAmount;
  }

  public BigDecimal getLineTotal() {
    return lineTotal;
  }

  public void setLineTotal(BigDecimal lineTotal) {
    this.lineTotal = lineTotal;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(OffsetDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
