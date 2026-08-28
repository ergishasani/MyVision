package com.myvision.api.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Customer numbers, contact role, and the accounting reference fields.
 *
 * <p>A customer number identifies the contact in the accountant's books, so the rules that matter
 * are that it is unique per company and never handed out twice.
 */
class ClientNumberingIntegrationTest extends AbstractIntegrationTest {

  @Test
  void numbersAreAssignedInSequenceFrom1000() throws Exception {
    String token = registerAndGetToken("num-seq@myvision.dev", "Numbering Co");

    mockMvc.perform(get("/api/clients/next-number").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextCustomerNumber").value(1000));

    createNamed(token, "First GmbH", 1000);
    createNamed(token, "Second GmbH", 1001);
    createNamed(token, "Third GmbH", 1002);

    mockMvc.perform(get("/api/clients/next-number").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextCustomerNumber").value(1003));
  }

  @Test
  void anExplicitNumberIsHonouredAndAdvancesTheCounter() throws Exception {
    String token = registerAndGetToken("num-explicit@myvision.dev", "Explicit Co");

    // Migrating from another system means bringing existing references across.
    createWithNumber(token, "Imported GmbH", 5000);

    // The counter jumps past it, so the next automatic number cannot collide.
    mockMvc.perform(get("/api/clients/next-number").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextCustomerNumber").value(5001));
  }

  @Test
  void aNumberAlreadyInUseIsRejected() throws Exception {
    String token = registerAndGetToken("num-dup@myvision.dev", "Duplicate Co");
    createWithNumber(token, "Original GmbH", 2000);

    // Silently reassigning would point two contacts at one account reference.
    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Clash GmbH\",\"customerNumber\":2000}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Customer number 2000 is already in use"));
  }

  @Test
  void numbersAreScopedPerCompany() throws Exception {
    String mine = registerAndGetToken("num-mine@myvision.dev", "Mine Co");
    String theirs = registerAndGetToken("num-theirs@myvision.dev", "Theirs Co");

    // Both companies start their own sequence; uniqueness is per company, not global.
    createNamed(mine, "Mine GmbH", 1000);
    createNamed(theirs, "Theirs GmbH", 1000);
  }

  @Test
  void roleAndAccountingReferencesRoundTrip() throws Exception {
    String token = registerAndGetToken("num-role@myvision.dev", "Role Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "type": "individual",
                  "name": "x",
                  "firstName": "Erika",
                  "lastName": "Mustermann",
                  "contactRole": "supplier",
                  "debtorNumber": "10001",
                  "creditorNumber": "70001"
                }
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.contactRole").value("supplier"))
        .andExpect(jsonPath("$.debtorNumber").value("10001"))
        .andExpect(jsonPath("$.creditorNumber").value("70001"))
        .andExpect(jsonPath("$.customerNumber").value(1000))
        .andReturn();

    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();
    mockMvc.perform(get("/api/clients/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.contactRole").value("supplier"))
        .andExpect(jsonPath("$.name").value("Erika Mustermann"));
  }

  @Test
  void aContactDefaultsToCustomer() throws Exception {
    String token = registerAndGetToken("num-default@myvision.dev", "Default Co");

    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Plain GmbH\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.contactRole").value("customer"));
  }

  private void createNamed(String token, String name, int expectedNumber) throws Exception {
    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"%s\"}".formatted(name)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.customerNumber").value(expectedNumber));
  }

  private void createWithNumber(String token, String name, int number) throws Exception {
    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"%s\",\"customerNumber\":%d}"
                .formatted(name, number)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.customerNumber").value(number));
  }
}
