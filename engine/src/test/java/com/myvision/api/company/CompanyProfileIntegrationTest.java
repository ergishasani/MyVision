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
        .andExpect(jsonPath("$.invoicePrefix").value("INV"))
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
        .andExpect(jsonPath("$.invoicePrefix").value("INV"));
  }

  @Test
  void invoiceCounterCannotBeRewound() throws Exception {
    String token = registerAndGetToken("company-counter@myvision.dev", "Counter Bau GmbH");

    // nextInvoiceNumber is deliberately not part of the update contract. Rewinding it would
    // produce duplicate invoice numbers, which is a compliance problem rather than a preference.
    mockMvc.perform(patch("/api/company")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nextInvoiceNumber\": 1, \"invoicePrefix\": \"RE\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.invoicePrefix").value("RE"))
        .andExpect(jsonPath("$.nextInvoiceNumber").value(1));
  }

  @Test
  void profileRequiresAuthentication() throws Exception {
    mockMvc.perform(get("/api/company")).andExpect(status().isUnauthorized());
  }
}
