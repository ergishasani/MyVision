package com.myvision.api.entity;

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

/**
 * An alternative unit for a product — a pack of 10, a pallet of 500.
 *
 * <p>Only the factor is stored. The price of the alternative unit is derived from the product's
 * net price, so changing the base price cannot leave a stale pack price behind it.
 *
 * <p>Like {@link ClientContactDetail}, this is replaced wholesale rather than edited in place,
 * so it carries no updated_at and does not extend {@code BaseEntity}.
 */
@Entity
@Table(name = "product_units")
public class ProductUnit {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "product_id", nullable = false, updatable = false)
  private UUID productId;

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "product_unit")
  private ProductUnitCode unit = ProductUnitCode.pcs;

  /** How many standard units one of these equals. Always greater than zero. */
  @Column(nullable = false, precision = 12, scale = 4)
  private BigDecimal factor = BigDecimal.ONE;

  @Column(nullable = false)
  private Integer position = 0;

  @Column(name = "created_at", nullable = false, updatable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getProductId() {
    return productId;
  }

  public void setProductId(UUID productId) {
    this.productId = productId;
  }

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public ProductUnitCode getUnit() {
    return unit;
  }

  public void setUnit(ProductUnitCode unit) {
    this.unit = unit;
  }

  public BigDecimal getFactor() {
    return factor;
  }

  public void setFactor(BigDecimal factor) {
    this.factor = factor;
  }

  public Integer getPosition() {
    return position;
  }

  public void setPosition(Integer position) {
    this.position = position;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(OffsetDateTime createdAt) {
    this.createdAt = createdAt;
  }
}
