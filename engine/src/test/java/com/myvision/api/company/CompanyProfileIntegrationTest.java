package com.myvision.api.company;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** The company profile behind the settings screens. */
class CompanyProfileIntegrationTest extends AbstractIntegrationTest {

  @Test
  void profileIsReturnedWithRegistrationDefaults() throws Exception {
    String token = registerAndGetToken("company-profile@myvision.dev", "Profile Bau GmbH");

    mockMvc.perform(get("/api/company").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Profile Bau GmbH"))
        .andExpect(jsonPath("$.countryCode").value("DE"))
        .andExpect(jsonPath("$.defaultCurrency").value("EUR"))
        .andExpect(jsonPath("$.defaultPaymentMethod").value("bank_transfer"))
        .andExpect(jsonPath("$.paymentTermsDays").value(14));
  }

  @Test
  void profileUpdatesArePartial() throws Exception {
    String token = registerAndGetToken("company-patch@myvision.dev", "Patch Bau GmbH");

    mockMvc.perform(patch("/api/company")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "legalName": "Patch Bau GmbH & Co. KG",
                  "vatNumber": "DE123456789",
                  "city": "Neuhof",
                  "paymentTermsDays": 30,
                  "countryCode": "de",
                  "defaultCurrency": "eur"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.legalName").value("Patch Bau GmbH & Co. KG"))
        .andExpect(jsonPath("$.vatNumber").value("DE123456789"))
        .andExpect(jsonPath("$.paymentTermsDays").value(30))
        // Codes are normalised so rendering and comparisons stay predictable.
        .andExpect(jsonPath("$.countryCode").value("DE"))
        .andExpect(jsonPath("$.defaultCurrency").value("EUR"))
        // Untouched fields keep their value: this is PATCH, not PUT.
        .andExpect(jsonPath("$.name").value("Patch Bau GmbH"))
        .andExpect(jsonPath("$.defaultPaymentMethod").value("bank_transfer"));
  }

  @Test
  void numberingIsNotPartOfTheCompanyProfile() throws Exception {
    String token = registerAndGetToken("company-counter@myvision.dev", "Counter Bau GmbH");

    // Formats and counters live in number_ranges and are edited through the accounting settings
    // endpoint, which is where the forward-only rule is enforced. Posting them here changes
    // nothing rather than opening a second way in.
    mockMvc.perform(patch("/api/company")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nextInvoiceNumber\": 1, \"invoicePrefix\": \"RE\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.invoicePrefix").doesNotExist())
        .andExpect(jsonPath("$.nextInvoiceNumber").doesNotExist());

    // The real counter is untouched by that request.
    mockMvc.perform(get("/api/settings/accounting/number-ranges")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$[?(@.type=='invoice')].format").value("INV-%NUMBER"))
        .andExpect(jsonPath("$[?(@.type=='invoice')].nextNumber").value(1));
  }

  @Test
  void profileRequiresAuthentication() throws Exception {
    mockMvc.perform(get("/api/company")).andExpect(status().isUnauthorized());
  }
}
