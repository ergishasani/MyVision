package com.myvision.api.project;

import com.myvision.api.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "projects")
public class Project extends BaseEntity {

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Column(name = "client_id", nullable = false)
  private UUID clientId;

  @Column(nullable = false)
  private String name;

  private String code;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "project_status")
  private ProjectStatus status = ProjectStatus.draft;

  private String jobSiteAddressLine1;
  private String jobSiteAddressLine2;
  private String jobSiteCity;
  private String jobSiteRegion;
  private String jobSitePostalCode;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 2)
  private String jobSiteCountryCode = "DE";

  private LocalDate startDate;
  private LocalDate endDate;
  private BigDecimal budgetAmount;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 3)
  private String currency = "EUR";

  private String description;

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

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getCode() {
    return code;
  }

  public void setCode(String code) {
    this.code = code;
  }

  public ProjectStatus getStatus() {
    return status;
  }

  public void setStatus(ProjectStatus status) {
    this.status = status;
  }

  public String getJobSiteAddressLine1() {
    return jobSiteAddressLine1;
  }

  public void setJobSiteAddressLine1(String jobSiteAddressLine1) {
    this.jobSiteAddressLine1 = jobSiteAddressLine1;
  }

  public String getJobSiteAddressLine2() {
    return jobSiteAddressLine2;
  }

  public void setJobSiteAddressLine2(String jobSiteAddressLine2) {
    this.jobSiteAddressLine2 = jobSiteAddressLine2;
  }

  public String getJobSiteCity() {
    return jobSiteCity;
  }

  public void setJobSiteCity(String jobSiteCity) {
    this.jobSiteCity = jobSiteCity;
  }

  public String getJobSiteRegion() {
    return jobSiteRegion;
  }

  public void setJobSiteRegion(String jobSiteRegion) {
    this.jobSiteRegion = jobSiteRegion;
  }

  public String getJobSitePostalCode() {
    return jobSitePostalCode;
  }

  public void setJobSitePostalCode(String jobSitePostalCode) {
    this.jobSitePostalCode = jobSitePostalCode;
  }

  public String getJobSiteCountryCode() {
    return jobSiteCountryCode;
  }

  public void setJobSiteCountryCode(String jobSiteCountryCode) {
    this.jobSiteCountryCode = jobSiteCountryCode;
  }

  public LocalDate getStartDate() {
    return startDate;
  }

  public void setStartDate(LocalDate startDate) {
    this.startDate = startDate;
  }

  public LocalDate getEndDate() {
    return endDate;
  }

  public void setEndDate(LocalDate endDate) {
    this.endDate = endDate;
  }

  public BigDecimal getBudgetAmount() {
    return budgetAmount;
  }

  public void setBudgetAmount(BigDecimal budgetAmount) {
    this.budgetAmount = budgetAmount;
  }

  public String getCurrency() {
    return currency;
  }

  public void setCurrency(String currency) {
    this.currency = currency;
  }

  public String getDescription() {
    return description;
  }

  public void setDescription(String description) {
    this.description = description;
  }
}
