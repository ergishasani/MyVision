package com.myvision.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

/** One labelled way to reach a client: a phone number, an email address, or a website. */
@Entity
@Table(name = "client_contact_details")
public class ClientContactDetail {

  @Id
  @GeneratedValue
  private UUID id;

  @Column(name = "client_id", nullable = false, updatable = false)
  private UUID clientId;

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "contact_detail_kind")
  private ContactDetailKind kind;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "contact_detail_label")
  private ContactDetailLabel label = ContactDetailLabel.work;

  @Column(nullable = false)
  private String value;

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

  public UUID getClientId() {
    return clientId;
  }

  public void setClientId(UUID clientId) {
    this.clientId = clientId;
  }

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public ContactDetailKind getKind() {
    return kind;
  }

  public void setKind(ContactDetailKind kind) {
    this.kind = kind;
  }

  public ContactDetailLabel getLabel() {
    return label;
  }

  public void setLabel(ContactDetailLabel label) {
    this.label = label;
  }

  public String getValue() {
    return value;
  }

  public void setValue(String value) {
    this.value = value;
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
