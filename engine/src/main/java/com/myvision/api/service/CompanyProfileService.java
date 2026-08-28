package com.myvision.api.service;

import com.myvision.api.dto.CompanyProfileResponse;
import com.myvision.api.dto.CompanyUpdateRequest;
import com.myvision.api.entity.Company;
import com.myvision.api.entity.CompanySettings;
import com.myvision.api.exception.ResourceNotFoundException;
import com.myvision.api.repository.CompanyRepository;
import com.myvision.api.repository.CompanySettingsRepository;
import java.math.BigDecimal;
import java.util.Locale;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads and updates the company profile shown on the settings screens.
 *
 * <p>Company details are printed on every invoice, so a change here rewrites how future documents
 * identify the business. Updates are therefore audited.
 */
@Service
public class CompanyProfileService {

  private final CompanyAccessService companyAccessService;
  private final CompanyRepository companyRepository;
  private final CompanySettingsRepository companySettingsRepository;
  private final AuditLogService auditLogService;

  public CompanyProfileService(
      CompanyAccessService companyAccessService,
      CompanyRepository companyRepository,
      CompanySettingsRepository companySettingsRepository,
      AuditLogService auditLogService
  ) {
    this.companyAccessService = companyAccessService;
    this.companyRepository = companyRepository;
    this.companySettingsRepository = companySettingsRepository;
    this.auditLogService = auditLogService;
  }

  @Transactional(readOnly = true)
  public CompanyProfileResponse get(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Company company = requireCompany(companyId);
    CompanySettings settings = companySettingsRepository.findById(companyId).orElse(null);
    return toResponse(company, settings);
  }

  @Transactional
  public CompanyProfileResponse update(UUID userId, CompanyUpdateRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Company company = requireCompany(companyId);

    applyIfPresent(request.name(), company::setName);
    applyIfPresent(request.legalName(), company::setLegalName);
    applyIfPresent(request.vatNumber(), company::setVatNumber);
    applyIfPresent(request.registrationNumber(), company::setRegistrationNumber);
    applyIfPresent(request.email(), company::setEmail);
    applyIfPresent(request.phone(), company::setPhone);
    applyIfPresent(request.website(), company::setWebsite);
    applyIfPresent(request.addressLine1(), company::setAddressLine1);
    applyIfPresent(request.addressLine2(), company::setAddressLine2);
    applyIfPresent(request.city(), company::setCity);
    applyIfPresent(request.region(), company::setRegion);
    applyIfPresent(request.postalCode(), company::setPostalCode);
    applyIfPresent(request.bankName(), company::setBankName);
    applyIfPresent(request.iban(), company::setIban);
    applyIfPresent(request.bic(), company::setBic);
    // The document prefixes moved to accounting settings, where they live beside the counter
    // they format. Only the payment-method default is still a plain company preference.
    // A direct check rather than applyIfPresent, which is String-typed and would treat "" as absent.
    if (request.defaultPaymentMethod() != null) {
      company.setDefaultPaymentMethod(request.defaultPaymentMethod());
    }

    // Codes are stored uppercase so document rendering and comparisons stay predictable.
    if (request.countryCode() != null) {
      company.setCountryCode(request.countryCode().toUpperCase(Locale.ROOT));
    }
    if (request.defaultCurrency() != null) {
      company.setDefaultCurrency(request.defaultCurrency().toUpperCase(Locale.ROOT));
    }
    if (request.defaultLanguage() != null) {
      company.setDefaultLanguage(request.defaultLanguage().toLowerCase(Locale.ROOT));
    }
    if (request.paymentTermsDays() != null) {
      company.setPaymentTermsDays(request.paymentTermsDays());
    }

    companyRepository.save(company);

    CompanySettings settings = companySettingsRepository.findById(companyId).orElse(null);
    if (settings != null) {
      applyIfPresent(request.quoteFooter(), settings::setQuoteFooter);
      applyIfPresent(request.invoiceFooter(), settings::setInvoiceFooter);
      if (request.defaultVatRate() != null) {
        settings.setDefaultVatRate(request.defaultVatRate());
      }
      companySettingsRepository.save(settings);
    }

    auditLogService.record(companyId, userId, "company", companyId, "updated", "{}");

    return toResponse(company, settings);
  }

  private Company requireCompany(UUID companyId) {
    return companyRepository.findById(companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
  }

  private static CompanyProfileResponse toResponse(Company company, CompanySettings settings) {
    BigDecimal vatRate = settings == null ? null : settings.getDefaultVatRate();
    String quoteFooter = settings == null ? null : settings.getQuoteFooter();
    String invoiceFooter = settings == null ? null : settings.getInvoiceFooter();
    return CompanyProfileResponse.from(company, vatRate, quoteFooter, invoiceFooter);
  }

  /** PATCH semantics: a null field means "leave as is", not "clear it". */
  private static void applyIfPresent(String value, Consumer<String> setter) {
    if (value != null) {
      setter.accept(value);
    }
  }
}
