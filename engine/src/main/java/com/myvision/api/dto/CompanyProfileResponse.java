package com.myvision.api.dto;

import com.myvision.api.entity.Company;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * The full company profile behind the settings screens.
 *
 * <p>Wider than {@link CompanyResponse}, which stays a small summary for the auth payload.
 */
public record CompanyProfileResponse(
    UUID id,
    String name,
    String legalName,
    String vatNumber,
    String registrationNumber,
    String email,
    String phone,
    String website,
    String addressLine1,
    String addressLine2,
    String city,
    String region,
    String postalCode,
    String countryCode,
    String defaultCurrency,
    String defaultLanguage,
    String logoUrl,
    String bankName,
    String iban,
    String bic,
    Integer paymentTermsDays,
    String defaultPaymentMethod,
    BigDecimal defaultVatRate,
    String quoteFooter,
    String invoiceFooter
) {

  public static CompanyProfileResponse from(
      Company company,
      BigDecimal defaultVatRate,
      String quoteFooter,
      String invoiceFooter
  ) {
    return new CompanyProfileResponse(
        company.getId(),
        company.getName(),
        company.getLegalName(),
        company.getVatNumber(),
        company.getRegistrationNumber(),
        company.getEmail(),
        company.getPhone(),
        company.getWebsite(),
        company.getAddressLine1(),
        company.getAddressLine2(),
        company.getCity(),
        company.getRegion(),
        company.getPostalCode(),
        company.getCountryCode(),
        company.getDefaultCurrency(),
        company.getDefaultLanguage(),
        company.getLogoUrl(),
        company.getBankName(),
        company.getIban(),
        company.getBic(),
        company.getPaymentTermsDays(),
        company.getDefaultPaymentMethod().name(),
        defaultVatRate,
        quoteFooter,
        invoiceFooter
    );
  }
}
