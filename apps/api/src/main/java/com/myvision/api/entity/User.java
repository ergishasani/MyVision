package com.myvision.api.entity;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

@Entity
@Table(name = "users")
public class User extends BaseEntity {

  @Column(nullable = false, unique = true)
  private String email;

  @Column(nullable = false)
  private String passwordHash;

  @Column(nullable = false)
  private String fullName;

  private String phone;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "user_status")
  private UserStatus status = UserStatus.active;

  private OffsetDateTime lastLoginAt;
  private OffsetDateTime emailVerifiedAt;
  private OffsetDateTime passwordChangedAt;

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPasswordHash() {
    return passwordHash;
  }

  public void setPasswordHash(String passwordHash) {
    this.passwordHash = passwordHash;
  }

  public String getFullName() {
    return fullName;
  }

  public void setFullName(String fullName) {
    this.fullName = fullName;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public UserStatus getStatus() {
    return status;
  }

  public void setStatus(UserStatus status) {
    this.status = status;
  }

  public OffsetDateTime getLastLoginAt() {
    return lastLoginAt;
  }

  public void setLastLoginAt(OffsetDateTime lastLoginAt) {
    this.lastLoginAt = lastLoginAt;
  }

  public OffsetDateTime getEmailVerifiedAt() {
    return emailVerifiedAt;
  }

  public void setEmailVerifiedAt(OffsetDateTime emailVerifiedAt) {
    this.emailVerifiedAt = emailVerifiedAt;
  }

  public OffsetDateTime getPasswordChangedAt() {
    return passwordChangedAt;
  }

  public void setPasswordChangedAt(OffsetDateTime passwordChangedAt) {
    this.passwordChangedAt = passwordChangedAt;
  }
}
