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
 * Multiple labelled phones, emails, and websites per contact.
 *
 * <p>The rule that carries real consequence is which address becomes the primary one, because
 * that is where an invoice gets sent.
 */
class ClientContactDetailsIntegrationTest extends AbstractIntegrationTest {

  @Test
  void severalDetailsOfEachKindAreStored() throws Exception {
    String token = registerAndGetToken("details-many@myvision.dev", "Details Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "type": "business",
                  "name": "Multi Kontakt GmbH",
                  "contactDetails": [
                    { "kind": "phone", "label": "work",   "value": "+49 661 1000" },
                    { "kind": "phone", "label": "mobile", "value": "+49 170 2000" },
                    { "kind": "email", "label": "work",   "value": "info@multi.de" },
                    { "kind": "website", "label": "work", "value": "https://multi.de" }
                  ]
                }
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.contactDetails.length()").value(4))
        .andReturn();

    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();
    mockMvc.perform(get("/api/clients/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contactDetails.length()").value(4));
  }

  @Test
  void aBillingAddressBecomesThePrimaryEmail() throws Exception {
    String token = registerAndGetToken("details-billing@myvision.dev", "Billing Co");

    // The office address is listed first, but invoices must go to accounts payable.
    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "type": "business",
                  "name": "Rechnung GmbH",
                  "contactDetails": [
                    { "kind": "email", "label": "work",    "value": "office@rechnung.de" },
                    { "kind": "email", "label": "billing", "value": "ap@rechnung.de" }
                  ]
                }
                """))
        .andExpect(status().isCreated())
        // clients.email is what invoice delivery reads, so the billing address has to win.
        .andExpect(jsonPath("$.email").value("ap@rechnung.de"));
  }

  @Test
  void withoutABillingLabelTheFirstEntryWins() throws Exception {
    String token = registerAndGetToken("details-first@myvision.dev", "First Co");

    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "type": "business",
                  "name": "Erste GmbH",
                  "contactDetails": [
                    { "kind": "phone", "label": "work",   "value": "+49 661 1111" },
                    { "kind": "phone", "label": "mobile", "value": "+49 170 2222" }
                  ]
                }
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.phone").value("+49 661 1111"));
  }

  @Test
  void updatingReplacesTheWholeSet() throws Exception {
    String token = registerAndGetToken("details-replace@myvision.dev", "Replace Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "type":"business","name":"Ersetzen GmbH",
                  "contactDetails":[
                    {"kind":"phone","label":"work","value":"+49 661 1111"},
                    {"kind":"phone","label":"fax","value":"+49 661 9999"}
                  ]
                }
                """))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    // The form sends the complete set, so a removed row must actually disappear.
    mockMvc.perform(patch("/api/clients/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"contactDetails":[{"kind":"phone","label":"mobile","value":"+49 170 3333"}]}
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contactDetails.length()").value(1))
        .andExpect(jsonPath("$.phone").value("+49 170 3333"));
  }

  @Test
  void omittingTheListLeavesExistingDetailsAlone() throws Exception {
    String token = registerAndGetToken("details-patch@myvision.dev", "Patch Details Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"type":"business","name":"Behalten GmbH",
                 "contactDetails":[{"kind":"email","label":"work","value":"keep@behalten.de"}]}
                """))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    // PATCH semantics: an absent field means "unchanged", not "clear".
    mockMvc.perform(patch("/api/clients/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"city\":\"Fulda\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.city").value("Fulda"))
        .andExpect(jsonPath("$.contactDetails.length()").value(1))
        .andExpect(jsonPath("$.email").value("keep@behalten.de"));
  }

  @Test
  void blankValuesAreDiscarded() throws Exception {
    String token = registerAndGetToken("details-blank@myvision.dev", "Blank Co");

    // The form renders empty rows; they should not become empty records.
    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"type":"business","name":"Leer GmbH",
                 "contactDetails":[
                   {"kind":"email","label":"work","value":"real@leer.de"},
                   {"kind":"phone","label":"work","value":"   "}
                 ]}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.contactDetails.length()").value(1))
        .andExpect(jsonPath("$.phone").doesNotExist());
  }
}
