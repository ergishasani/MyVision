package com.myvision.api.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Payment and tax information on a contact.
 *
 * <p>The pieces that carry compliance weight are the two tax identifiers, which are separate
 * numbers and must not be conflated, and the payment-terms override, whose null means "inherit"
 * rather than "zero days".
 */
class ClientPaymentInformationIntegrationTest extends AbstractIntegrationTest {

  @Test
  void bankAndTaxDetailsRoundTrip() throws Exception {
    String token = registerAndGetToken("pay-info@myvision.dev", "Payment Info Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "type": "business",
                  "name": "Zahlung GmbH",
                  "iban": "DE89370400440532013000",
                  "bic": "COBADEFFXXX",
                  "vatNumber": "DE123456789",
                  "taxNumber": "013/815/08154",
                  "showVatId": true,
                  "einvoiceStandard": true,
                  "paymentTermsDays": 30,
                  "terms": "Zahlbar innerhalb 30 Tagen ohne Abzug."
                }
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.iban").value("DE89370400440532013000"))
        .andExpect(jsonPath("$.bic").value("COBADEFFXXX"))
        // Two different identifiers: USt-IdNr. and Steuernummer.
        .andExpect(jsonPath("$.vatNumber").value("DE123456789"))
        .andExpect(jsonPath("$.taxNumber").value("013/815/08154"))
        .andExpect(jsonPath("$.showVatId").value(true))
        .andExpect(jsonPath("$.einvoiceStandard").value(true))
        .andExpect(jsonPath("$.paymentTermsDays").value(30))
        .andReturn();

    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();
    mockMvc.perform(get("/api/clients/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.taxNumber").value("013/815/08154"))
        .andExpect(jsonPath("$.terms").value("Zahlbar innerhalb 30 Tagen ohne Abzug."));
  }

  @Test
  void togglesDefaultToOff() throws Exception {
    String token = registerAndGetToken("pay-default@myvision.dev", "Default Toggle Co");

    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Standard GmbH\"}"))
        .andExpect(status().isCreated())
        // Printing a VAT ID or sending a structured e-invoice has to be a deliberate choice.
        .andExpect(jsonPath("$.showVatId").value(false))
        .andExpect(jsonPath("$.einvoiceStandard").value(false));
  }

  @Test
  void noPaymentTermsMeansInheritTheCompanyDefault() throws Exception {
    String token = registerAndGetToken("pay-inherit@myvision.dev", "Inherit Co");

    // Null rather than 0: a client with no override must follow the company setting, and keep
    // following it when that setting changes.
    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Erben GmbH\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.paymentTermsDays").doesNotExist());
  }

  @Test
  void togglesCanBeSwitchedOffAgain() throws Exception {
    String token = registerAndGetToken("pay-toggle@myvision.dev", "Toggle Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Umschalten GmbH\",\"showVatId\":true}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    // A boolean patched to false must actually stick; "!= null" is the right guard, not "isTrue".
    mockMvc.perform(patch("/api/clients/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"showVatId\":false}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.showVatId").value(false));
  }

  @Test
  void anImpossiblePaymentTermIsRejected() throws Exception {
    String token = registerAndGetToken("pay-invalid@myvision.dev", "Invalid Terms Co");

    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Negativ GmbH\",\"paymentTermsDays\":-5}"))
        .andExpect(status().isBadRequest());
  }
}
