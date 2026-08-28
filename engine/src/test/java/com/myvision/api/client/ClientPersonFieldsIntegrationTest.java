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
 * Structured name parts on an individual client.
 *
 * <p>The property that matters is that {@code name} — the string every document renders — stays
 * correct and non-null however the parts are supplied or edited.
 */
class ClientPersonFieldsIntegrationTest extends AbstractIntegrationTest {

  @Test
  void anIndividualsDisplayNameIsComposedFromItsParts() throws Exception {
    String token = registerAndGetToken("person-create@myvision.dev", "Person Co");

    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "type": "individual",
                  "name": "ignored",
                  "salutation": "Frau",
                  "academicTitle": "Dr.",
                  "firstName": "Erika",
                  "lastName": "Mustermann",
                  "position": "Head of procurement"
                }
                """))
        .andExpect(status().isCreated())
        // German invoices are addressed formally, so the parts have to survive separately and
        // still produce one rendered name.
        .andExpect(jsonPath("$.name").value("Frau Dr. Erika Mustermann"))
        .andExpect(jsonPath("$.firstName").value("Erika"))
        .andExpect(jsonPath("$.lastName").value("Mustermann"))
        .andExpect(jsonPath("$.position").value("Head of procurement"));
  }

  @Test
  void editingASurnameUpdatesTheRenderedName() throws Exception {
    String token = registerAndGetToken("person-patch@myvision.dev", "Person Patch Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"type":"individual","name":"x","firstName":"Erika","lastName":"Mustermann"}
                """))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(patch("/api/clients/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"lastName\":\"Schmidt\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("Erika Schmidt"))
        .andExpect(jsonPath("$.firstName").value("Erika"));
  }

  @Test
  void organisationsKeepTheNameAsEntered() throws Exception {
    String token = registerAndGetToken("org-name@myvision.dev", "Org Co");

    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"type":"business","name":"Hofmann Rohbau GmbH","contactName":"Petra Hofmann"}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Hofmann Rohbau GmbH"))
        .andExpect(jsonPath("$.contactName").value("Petra Hofmann"));
  }

  @Test
  void anIndividualWithNoPartsFallsBackToTheGivenName() throws Exception {
    String token = registerAndGetToken("person-fallback@myvision.dev", "Fallback Co");

    // name is NOT NULL and is what documents render, so it must never end up blank.
    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"individual\",\"name\":\"Artin Hyko\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Artin Hyko"));
  }

  @Test
  void personFieldsSurviveAReadBack() throws Exception {
    String token = registerAndGetToken("person-read@myvision.dev", "Read Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"type":"individual","name":"x","salutation":"Herr","firstName":"Klodian",
                 "lastName":"Turja","nameSuffix":"jr.","position":"Site manager"}
                """))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(get("/api/clients/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.salutation").value("Herr"))
        .andExpect(jsonPath("$.nameSuffix").value("jr."))
        .andExpect(jsonPath("$.name").value("Herr Klodian Turja jr."));
  }
}
