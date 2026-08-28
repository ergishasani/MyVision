package com.myvision.api.entity;

import com.myvision.api.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

@Entity
@Table(name = "products")
public class Product extends BaseEntity {

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  /** Unique within the company; assigned on create and never reused. */
  @Column(name = "article_number")
  private Integer articleNumber;

  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "product_category")
  private ProductCategory category = ProductCategory.article;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "product_unit")
  private ProductUnitCode unit = ProductUnitCode.pcs;

  @Column(name = "tax_rate", nullable = false, precision = 5, scale = 2)
  private BigDecimal taxRate = new BigDecimal("19.00");

  /** Net is authoritative; gross is always derived from it. See the V11 migration. */
  @Column(name = "selling_price_net", nullable = false, precision = 12, scale = 2)
  private BigDecimal sellingPriceNet = BigDecimal.ZERO;

  /** Null means "we do not know what this costs us", which is not the same as costing nothing. */
  @Column(name = "purchase_price_net", precision = 12, scale = 2)
  private BigDecimal purchasePriceNet;

  @Column(name = "description")
  private String description;

  @Column(name = "internal_note")
  private String internalNote;

  @Column(name = "inventory_enabled", nullable = false)
  private Boolean inventoryEnabled = false;

  @Column(name = "archived_at")
  private OffsetDateTime archivedAt;

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public Integer getArticleNumber() {
    return articleNumber;
  }

  public void setArticleNumber(Integer articleNumber) {
    this.articleNumber = articleNumber;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public ProductCategory getCategory() {
    return category;
  }

  public void setCategory(ProductCategory category) {
    this.category = category;
  }

  public ProductUnitCode getUnit() {
    return unit;
  }

  public void setUnit(ProductUnitCode unit) {
    this.unit = unit;
  }

  public BigDecimal getTaxRate() {
    return taxRate;
  }

  public void setTaxRate(BigDecimal taxRate) {
    this.taxRate = taxRate;
  }

  public BigDecimal getSellingPriceNet() {
    return sellingPriceNet;
  }

  public void setSellingPriceNet(BigDecimal sellingPriceNet) {
    this.sellingPriceNet = sellingPriceNet;
  }

  public BigDecimal getPurchasePriceNet() {
    return purchasePriceNet;
  }

  public void setPurchasePriceNet(BigDecimal purchasePriceNet) {
    this.purchasePriceNet = purchasePriceNet;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }

  public String getInternalNote() {
    return internalNote;
  }

  public void setInternalNote(String internalNote) {
    this.internalNote = internalNote;
  }

  public Boolean getInventoryEnabled() {
    return inventoryEnabled;
  }

  public void setInventoryEnabled(Boolean inventoryEnabled) {
    this.inventoryEnabled = inventoryEnabled;
  }

  public OffsetDateTime getArchivedAt() {
    return archivedAt;
  }

  public void setArchivedAt(OffsetDateTime archivedAt) {
    this.archivedAt = archivedAt;
  }
}
