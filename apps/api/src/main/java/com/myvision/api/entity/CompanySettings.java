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
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "company_settings")
public class CompanySettings {

  @Id
  @Column(name = "company_id")
  private UUID companyId;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @MapsId
  @JoinColumn(name = "company_id")
  private Company company;

  private String quoteFooter;
  private String invoiceFooter;

  @Column(nullable = false)
  private BigDecimal defaultVatRate = BigDecimal.valueOf(19);

  @Column(nullable = false)
  @JdbcTypeCode(SqlTypes.JSON)
  private String dashboardConfig = "{}";

  @Column(nullable = false, updatable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  @PrePersist
  void prePersist() {
    OffsetDateTime now = OffsetDateTime.now();
    if (createdAt == null) {
      createdAt = now;
    }
    if (updatedAt == null) {
      updatedAt = now;
    }
  }

  @PreUpdate
  void preUpdate() {
    updatedAt = OffsetDateTime.now();
  }

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public Company getCompany() {
    return company;
  }

  public void setCompany(Company company) {
    this.company = company;
  }

  public String getQuoteFooter() {
    return quoteFooter;
  }

  public void setQuoteFooter(String quoteFooter) {
    this.quoteFooter = quoteFooter;
  }

  public String getInvoiceFooter() {
    return invoiceFooter;
  }

  public void setInvoiceFooter(String invoiceFooter) {
    this.invoiceFooter = invoiceFooter;
  }

  public BigDecimal getDefaultVatRate() {
    return defaultVatRate;
  }

  public void setDefaultVatRate(BigDecimal defaultVatRate) {
    this.defaultVatRate = defaultVatRate;
  }

  public String getDashboardConfig() {
    return dashboardConfig;
  }

  public void setDashboardConfig(String dashboardConfig) {
    this.dashboardConfig = dashboardConfig;
  }

  public OffsetDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(OffsetDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public OffsetDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(OffsetDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }
}
