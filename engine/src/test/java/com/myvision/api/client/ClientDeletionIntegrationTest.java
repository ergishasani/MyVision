package com.myvision.api.client;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Archiving versus deleting a contact.
 *
 * <p>The distinction matters legally, not just tidily. An invoice has to keep the name and address
 * it was issued to, and German retention rules expect it to still be there years later. So a
 * contact who has been invoiced can be hidden but never removed.
 */
class ClientDeletionIntegrationTest extends AbstractIntegrationTest {

  @Test
  void anUnusedContactCanBeDeletedOutright() throws Exception {
    String token = registerAndGetToken("delete-unused@myvision.dev", "Delete Unused Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Versehen GmbH\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    // Nothing references them — a contact entered by mistake should not have to be archived.
    mockMvc.perform(delete("/api/clients/{id}/permanent", id)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/clients/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isNotFound());
  }

  @Test
  void aContactWithAnInvoiceCannotBeDeleted() throws Exception {
    String token = registerAndGetToken("delete-invoiced@myvision.dev", "Delete Invoiced Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Berechnet GmbH\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00}
                ]}
                """.formatted(id)))
        .andExpect(status().isCreated());

    // Refused with a sentence naming what is in the way, not a foreign-key error.
    mockMvc.perform(delete("/api/clients/{id}/permanent", id)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value(
            org.hamcrest.Matchers.containsString("1 invoice")));

    // And they are still there, because the invoice needs them.
    mockMvc.perform(get("/api/clients/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
  }

  @Test
  void archivingStillWorksAndIsReversibleInTheData() throws Exception {
    String token = registerAndGetToken("delete-archive@myvision.dev", "Archive Still Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Archiviert GmbH\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(delete("/api/clients/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/clients").header("Authorization", "Bearer " + token))
        .andExpect(jsonPath("$.length()").value(0));

    // Gone from the list, still fetchable by id: that is the difference from a delete.
    mockMvc.perform(get("/api/clients/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archivedAt").exists());
  }

  @Test
  void anotherCompanysContactCannotBeDeleted() throws Exception {
    String owner = registerAndGetToken("delete-owner@myvision.dev", "Delete Owner Co");
    String stranger = registerAndGetToken("delete-stranger@myvision.dev", "Delete Stranger Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + owner)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Fremd GmbH\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(delete("/api/clients/{id}/permanent", id)
            .header("Authorization", "Bearer " + stranger))
        .andExpect(status().isNotFound());

    mockMvc.perform(get("/api/clients/{id}", id).header("Authorization", "Bearer " + owner))
        .andExpect(status().isOk());
  }
}
