package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

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

