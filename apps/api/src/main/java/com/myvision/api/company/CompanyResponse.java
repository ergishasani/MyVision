package com.myvision.api.company;

import java.util.UUID;

public record CompanyResponse(
    UUID id,
    String name,
    String legalName,
    String vatNumber,
    String countryCode,
    String defaultCurrency,
    String defaultLanguage
) {

  public static CompanyResponse from(Company company) {
    return new CompanyResponse(
        company.getId(),
        company.getName(),
        company.getLegalName(),
        company.getVatNumber(),
        company.getCountryCode(),
        company.getDefaultCurrency(),
        company.getDefaultLanguage()
    );
  }
}

