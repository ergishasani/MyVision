package com.myvision.api.service;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Currency conversion is the highest-consequence arithmetic in the Stripe path: an exponent that
 * is wrong by one charges the customer ten times the invoice.
 */
class StripeAmountTest {

  @Test
  void euroAmountsConvertToCents() {
    assertThat(StripeService.toMinorUnits(new BigDecimal("238.00"), "eur")).isEqualTo(23800L);
    assertThat(StripeService.toMinorUnits(new BigDecimal("0.01"), "eur")).isEqualTo(1L);
    assertThat(StripeService.toMinorUnits(new BigDecimal("1234.56"), "EUR")).isEqualTo(123456L);
  }

  @Test
  void zeroDecimalCurrenciesUseWholeUnits() {
    // 5000 JPY is 5000 minor units, not 500000.
    assertThat(StripeService.toMinorUnits(new BigDecimal("5000"), "jpy")).isEqualTo(5000L);
    assertThat(StripeService.fromMinorUnits(5000L, "JPY")).isEqualByComparingTo("5000");
  }

  @Test
  void threeDecimalCurrenciesUseThousandths() {
    assertThat(StripeService.toMinorUnits(new BigDecimal("12.345"), "bhd")).isEqualTo(12345L);
    assertThat(StripeService.fromMinorUnits(12345L, "BHD")).isEqualByComparingTo("12.345");
  }

  @Test
  void conversionRoundTripsWithoutDrift() {
    BigDecimal original = new BigDecimal("999.99");
    long minor = StripeService.toMinorUnits(original, "eur");
    assertThat(StripeService.fromMinorUnits(minor, "eur")).isEqualByComparingTo(original);
  }

  @Test
  void subCentPrecisionIsRoundedNotTruncated() {
    // Half-up, so a half cent rounds toward the payee rather than silently vanishing.
    assertThat(StripeService.toMinorUnits(new BigDecimal("10.005"), "eur")).isEqualTo(1001L);
    assertThat(StripeService.toMinorUnits(new BigDecimal("10.004"), "eur")).isEqualTo(1000L);
  }

  @Test
  void missingAmountBecomesZeroRatherThanNull() {
    assertThat(StripeService.fromMinorUnits(null, "eur")).isEqualByComparingTo("0");
  }

  @Test
  void anAmountTooLargeForStripeFailsLoudly() {
    // longValueExact throws rather than wrapping around into a wrong charge.
    assertThatThrownBy(() ->
        StripeService.toMinorUnits(new BigDecimal("999999999999999999999.00"), "eur"))
        .isInstanceOf(ArithmeticException.class);
  }
}
