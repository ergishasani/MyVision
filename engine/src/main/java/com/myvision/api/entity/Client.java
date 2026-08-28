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
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.hibernate.annotations.JdbcType;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "clients")
public class Client extends BaseEntity {

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "client_type")
  private ClientType type = ClientType.business;

  @Column(nullable = false)
  private String name;

  private String contactName;

  // Structured name parts for individual clients; see V6__client_person_fields.sql.
  @Column(name = "salutation")
  private String salutation;

  @Column(name = "academic_title")
  private String academicTitle;

  @Column(name = "first_name")
  private String firstName;

  @Column(name = "last_name")
  private String lastName;

  @Column(name = "name_suffix")
  private String nameSuffix;

  @Column(name = "position")
  private String position;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(name = "contact_role", nullable = false, columnDefinition = "contact_role")
  private ContactRole contactRole = ContactRole.customer;

  /** Unique within the company; assigned on create and never reused. */
  @Column(name = "customer_number")
  private Integer customerNumber;

  @Column(name = "debtor_number")
  private String debtorNumber;

  @Column(name = "creditor_number")
  private String creditorNumber;

  @Column(name = "iban")
  private String iban;

  @Column(name = "bic")
  private String bic;

  @Column(name = "tax_number")
  private String taxNumber;

  @Column(name = "terms")
  private String terms;

  @Column(name = "show_vat_id", nullable = false)
  private Boolean showVatId = false;

  @Column(name = "einvoice_standard", nullable = false)
  private Boolean einvoiceStandard = false;

  @Column(name = "payment_terms_days")
  private Integer paymentTermsDays;

  /**
   * Skonto: the early-payment discount, and the window it applies in. Conditional — it is only
   * deducted if the customer actually pays inside {@code discountDays}, so it does not change the
   * invoice total when the invoice is written.
   */
  @Column(name = "discount_days")
  private Integer discountDays;

  @Column(name = "discount_percent", precision = 5, scale = 2)
  private BigDecimal discountPercent;

  /**
   * A standing reduction this customer always gets, read together with {@link #customerDiscountUnit}
   * because 10 and 10% are very different sums.
   */
  @Column(name = "customer_discount", precision = 12, scale = 2)
  private BigDecimal customerDiscount;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(name = "customer_discount_unit", nullable = false, columnDefinition = "discount_unit")
  private DiscountUnit customerDiscountUnit = DiscountUnit.percent;

  private String email;
  private String phone;
  private String vatNumber;
  private String addressLine1;
  private String addressLine2;
  private String city;
  private String region;
  private String postalCode;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 2)
  private String countryCode = "DE";

  private String notes;
  private OffsetDateTime archivedAt;

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public ClientType getType() {
    return type;
  }

  public void setType(ClientType type) {
    this.type = type;
  }

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getContactName() {
    return contactName;
  }

  public void setContactName(String contactName) {
    this.contactName = contactName;
  }

  public String getEmail() {
    return email;
  }

  public void setEmail(String email) {
    this.email = email;
  }

  public String getPhone() {
    return phone;
  }

  public void setPhone(String phone) {
    this.phone = phone;
  }

  public String getVatNumber() {
    return vatNumber;
  }

  public void setVatNumber(String vatNumber) {
    this.vatNumber = vatNumber;
  }

  public String getAddressLine1() {
    return addressLine1;
  }

  public void setAddressLine1(String addressLine1) {
    this.addressLine1 = addressLine1;
  }

  public String getAddressLine2() {
    return addressLine2;
  }

  public void setAddressLine2(String addressLine2) {
    this.addressLine2 = addressLine2;
  }

  public String getCity() {
    return city;
  }

  public void setCity(String city) {
    this.city = city;
  }

  public String getRegion() {
    return region;
  }

  public void setRegion(String region) {
    this.region = region;
  }

  public String getPostalCode() {
    return postalCode;
  }

  public void setPostalCode(String postalCode) {
    this.postalCode = postalCode;
  }

  public String getCountryCode() {
    return countryCode;
  }

  public void setCountryCode(String countryCode) {
    this.countryCode = countryCode;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public OffsetDateTime getArchivedAt() {
    return archivedAt;
  }

  public void setArchivedAt(OffsetDateTime archivedAt) {
    this.archivedAt = archivedAt;
  }

  public String getSalutation() {
    return salutation;
  }

  public void setSalutation(String salutation) {
    this.salutation = salutation;
  }

  public String getAcademicTitle() {
    return academicTitle;
  }

  public void setAcademicTitle(String academicTitle) {
    this.academicTitle = academicTitle;
  }

  public String getFirstName() {
    return firstName;
  }

  public void setFirstName(String firstName) {
    this.firstName = firstName;
  }

  public String getLastName() {
    return lastName;
  }

  public void setLastName(String lastName) {
    this.lastName = lastName;
  }

  public String getNameSuffix() {
    return nameSuffix;
  }

  public void setNameSuffix(String nameSuffix) {
    this.nameSuffix = nameSuffix;
  }

  public String getPosition() {
    return position;
  }

  public void setPosition(String position) {
    this.position = position;
  }

  public ContactRole getContactRole() {
    return contactRole;
  }

  public void setContactRole(ContactRole contactRole) {
    this.contactRole = contactRole;
  }

  public Integer getCustomerNumber() {
    return customerNumber;
  }

  public void setCustomerNumber(Integer customerNumber) {
    this.customerNumber = customerNumber;
  }

  public String getDebtorNumber() {
    return debtorNumber;
  }

  public void setDebtorNumber(String debtorNumber) {
    this.debtorNumber = debtorNumber;
  }

  public String getCreditorNumber() {
    return creditorNumber;
  }

  public void setCreditorNumber(String creditorNumber) {
    this.creditorNumber = creditorNumber;
  }

  public String getIban() {
    return iban;
  }

  public void setIban(String iban) {
    this.iban = iban;
  }

  public String getBic() {
    return bic;
  }

  public void setBic(String bic) {
    this.bic = bic;
  }

  public String getTaxNumber() {
    return taxNumber;
  }

  public void setTaxNumber(String taxNumber) {
    this.taxNumber = taxNumber;
  }

  public String getTerms() {
    return terms;
  }

  public void setTerms(String terms) {
    this.terms = terms;
  }

  public Boolean getShowVatId() {
    return showVatId;
  }

  public void setShowVatId(Boolean showVatId) {
    this.showVatId = showVatId;
  }

  public Boolean getEinvoiceStandard() {
    return einvoiceStandard;
  }

  public void setEinvoiceStandard(Boolean einvoiceStandard) {
    this.einvoiceStandard = einvoiceStandard;
  }

  public Integer getPaymentTermsDays() {
    return paymentTermsDays;
  }

  public void setPaymentTermsDays(Integer paymentTermsDays) {
    this.paymentTermsDays = paymentTermsDays;
  }

  public Integer getDiscountDays() {
    return discountDays;
  }

  public void setDiscountDays(Integer discountDays) {
    this.discountDays = discountDays;
  }

  public BigDecimal getDiscountPercent() {
    return discountPercent;
  }

  public void setDiscountPercent(BigDecimal discountPercent) {
    this.discountPercent = discountPercent;
  }

  public BigDecimal getCustomerDiscount() {
    return customerDiscount;
  }

  public void setCustomerDiscount(BigDecimal customerDiscount) {
    this.customerDiscount = customerDiscount;
  }

  public DiscountUnit getCustomerDiscountUnit() {
    return customerDiscountUnit;
  }

  public void setCustomerDiscountUnit(DiscountUnit customerDiscountUnit) {
    this.customerDiscountUnit = customerDiscountUnit;
  }
}
