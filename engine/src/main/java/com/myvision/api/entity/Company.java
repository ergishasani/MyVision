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
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "companies")
public class Company extends BaseEntity {

  @Column(nullable = false)
  private String name;

  private String legalName;
  private String vatNumber;
  private String registrationNumber;
  private String email;
  private String phone;
  private String website;
  private String addressLine1;
  private String addressLine2;
  private String city;
  private String region;
  private String postalCode;

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 2)
  private String countryCode = "DE";

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(nullable = false, length = 3)
  private String defaultCurrency = "EUR";

  @Column(nullable = false)
  private String defaultLanguage = "en";

  private String logoUrl;
  private String bankName;
  private String iban;
  private String bic;

  @Column(nullable = false)
  private Integer paymentTermsDays = 14;

  @Column(nullable = false)
  private String invoicePrefix = "INV";

  @Column(nullable = false)
  private Integer nextInvoiceNumber = 1;

  @Column(nullable = false)
  private String quotePrefix = "Q";

  @Column(nullable = false)
  private Integer nextQuoteNumber = 1;

  @Column(name = "next_customer_number", nullable = false)
  private Integer nextCustomerNumber = 1000;

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getLegalName() {
    return legalName;
  }

  public void setLegalName(String legalName) {
    this.legalName = legalName;
  }

  public String getVatNumber() {
    return vatNumber;
  }

  public void setVatNumber(String vatNumber) {
    this.vatNumber = vatNumber;
  }

  public String getRegistrationNumber() {
    return registrationNumber;
  }

  public void setRegistrationNumber(String registrationNumber) {
    this.registrationNumber = registrationNumber;
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

  public String getWebsite() {
    return website;
  }

  public void setWebsite(String website) {
    this.website = website;
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

  public String getDefaultCurrency() {
    return defaultCurrency;
  }

  public void setDefaultCurrency(String defaultCurrency) {
    this.defaultCurrency = defaultCurrency;
  }

  public String getDefaultLanguage() {
    return defaultLanguage;
  }

  public void setDefaultLanguage(String defaultLanguage) {
    this.defaultLanguage = defaultLanguage;
  }

  public String getLogoUrl() {
    return logoUrl;
  }

  public void setLogoUrl(String logoUrl) {
    this.logoUrl = logoUrl;
  }

  public String getBankName() {
    return bankName;
  }

  public void setBankName(String bankName) {
    this.bankName = bankName;
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

  public Integer getPaymentTermsDays() {
    return paymentTermsDays;
  }

  public void setPaymentTermsDays(Integer paymentTermsDays) {
    this.paymentTermsDays = paymentTermsDays;
  }

  public String getInvoicePrefix() {
    return invoicePrefix;
  }

  public void setInvoicePrefix(String invoicePrefix) {
    this.invoicePrefix = invoicePrefix;
  }

  public Integer getNextInvoiceNumber() {
    return nextInvoiceNumber;
  }

  public void setNextInvoiceNumber(Integer nextInvoiceNumber) {
    this.nextInvoiceNumber = nextInvoiceNumber;
  }

  public String getQuotePrefix() {
    return quotePrefix;
  }

  public void setQuotePrefix(String quotePrefix) {
    this.quotePrefix = quotePrefix;
  }

  public Integer getNextQuoteNumber() {
    return nextQuoteNumber;
  }

  public void setNextQuoteNumber(Integer nextQuoteNumber) {
    this.nextQuoteNumber = nextQuoteNumber;
  }

  public Integer getNextCustomerNumber() {
    return nextCustomerNumber;
  }

  public void setNextCustomerNumber(Integer nextCustomerNumber) {
    this.nextCustomerNumber = nextCustomerNumber;
  }
}
