package com.myvision.api.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import com.myvision.api.entity.PaymentMethod;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

/**
 * Partial update of the company profile. Every field is optional; a null leaves the stored value
 * untouched.
 *
 * <p>Carries no numbering at all any more. Formats and counters live in number_ranges and are
 * edited through the accounting settings endpoint, which enforces the rule that a counter may be
 * moved forward but never back — rewinding one would reissue an invoice number already in a
 * customer's hands.
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
    PaymentMethod defaultPaymentMethod,
    @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal defaultVatRate,
    @Size(max = 5000) String quoteFooter,
    @Size(max = 5000) String invoiceFooter
) {
}
