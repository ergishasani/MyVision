package com.myvision.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;

/** An account on the chart of accounts (Buchungskonto). */
@Entity
@Table(name = "booking_accounts")
public class BookingAccount extends BaseEntity {

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Column(name = "display_name", nullable = false)
  private String displayName;

  @Column(name = "name")
  private String name;

  /** Text rather than a number: some charts use leading zeros, and it identifies rather than counts. */
  @Column(name = "skr_account")
  private String skrAccount;

  @Column(name = "archived_at")
  private OffsetDateTime archivedAt;

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public String getDisplayName() {
    return displayName;
  }

  public void setDisplayName(String displayName) {
    this.displayName = displayName;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getSkrAccount() {
    return skrAccount;
  }

  public void setSkrAccount(String skrAccount) {
    this.skrAccount = skrAccount;
  }

  public OffsetDateTime getArchivedAt() {
    return archivedAt;
  }

  public void setArchivedAt(OffsetDateTime archivedAt) {
    this.archivedAt = archivedAt;
  }
}
