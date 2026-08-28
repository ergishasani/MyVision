package com.myvision.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

/** A cost centre (Kostenstelle): the bucket a cost or revenue is reported against. */
@Entity
@Table(name = "cost_centers")
public class CostCenter extends BaseEntity {

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Column(nullable = false)
  private String name;

  /** Unique within the company when set; two centres sharing one would blur the split. */
  @Column(name = "number")
  private String number;

  @Column(name = "archived_at")
  private OffsetDateTime archivedAt;

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getNumber() {
    return number;
  }

  public void setNumber(String number) {
    this.number = number;
  }

  public OffsetDateTime getArchivedAt() {
    return archivedAt;
  }

  public void setArchivedAt(OffsetDateTime archivedAt) {
    this.archivedAt = archivedAt;
  }
}
