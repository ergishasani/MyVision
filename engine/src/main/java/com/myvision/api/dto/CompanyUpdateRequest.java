package com.myvision.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Partial update of the company profile. Every field is optional; a null leaves the stored value
 * untouched.
 *
 * <p>Deliberately excludes nextInvoiceNumber and nextQuoteNumber. Those counters must only ever
 * move forward through document creation: letting an operator rewind them would produce duplicate
 * invoice numbers, which is a compliance problem rather than a preference.
 */
public record CompanyUpdateRequest(
    @Size(max = 255) String name,
    @Size(max = 255) String legalName,
    @Size(max = 64) String vatNumber,
    @Size(max = 64) String registrationNumber,
    @Email @Size(max = 255) String email,
    @Size(max = 64) String phone,
    @Size(max = 255) String website,
    @Size(max = 255) String addressLine1,
    @Size(max = 255) String addressLine2,
    @Size(max = 128) String city,
    @Size(max = 128) String region,
    @Size(max = 32) String postalCode,
    @Size(min = 2, max = 2) String countryCode,
    @Size(min = 3, max = 3) String defaultCurrency,
    @Size(max = 8) String defaultLanguage,
    @Size(max = 128) String bankName,
    @Size(max = 64) String iban,
    @Size(max = 32) String bic,
    @Positive Integer paymentTermsDays,
    @Size(max = 16) String invoicePrefix,
    @Size(max = 16) String quotePrefix,
    @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal defaultVatRate,
    @Size(max = 5000) String quoteFooter,
    @Size(max = 5000) String invoiceFooter
) {
}
