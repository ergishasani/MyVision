package com.myvision.api.client;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ClientIntegrationTest extends AbstractIntegrationTest {

  @Test
  void createAndListClients() throws Exception {
    String token = registerAndGetToken("clients-1@myvision.dev", "Clients Co 1");

    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "type": "business",
                  "name": "Acme Construction",
                  "contactName": "Jane Doe",
                  "email": "jane@acme.dev",
                  "city": "Berlin"
                }
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.id").isNotEmpty())
        .andExpect(jsonPath("$.name").value("Acme Construction"))
        .andExpect(jsonPath("$.type").value("business"));

    mockMvc.perform(get("/api/clients")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].name").value("Acme Construction"));
  }

  @Test
  void createClientRequiresName() throws Exception {
    String token = registerAndGetToken("clients-2@myvision.dev", "Clients Co 2");

    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\": \"business\"}"))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
  }

  @Test
  void listIsScopedToCurrentCompany() throws Exception {
    String tokenA = registerAndGetToken("tenant-a@myvision.dev", "Tenant A");
    String tokenB = registerAndGetToken("tenant-b@myvision.dev", "Tenant B");

    String clientAId = createClient(tokenA, "Client of A");
    createClient(tokenB, "Client of B");

    mockMvc.perform(get("/api/clients")
            .header("Authorization", "Bearer " + tokenA))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].name").value("Client of A"));

    // Tenant B must not be able to read tenant A's client.
    mockMvc.perform(get("/api/clients/{id}", clientAId)
            .header("Authorization", "Bearer " + tokenB))
        .andExpect(status().isNotFound());
  }

  @Test
  void deleteArchivesInsteadOfRemoving() throws Exception {
    String token = registerAndGetToken("clients-3@myvision.dev", "Clients Co 3");
    String clientId = createClient(token, "Archivable Client");

    mockMvc.perform(delete("/api/clients/{id}", clientId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    // Archived clients disappear from the list...
    mockMvc.perform(get("/api/clients")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));

    // ...but are still retrievable by id with archivedAt set.
    mockMvc.perform(get("/api/clients/{id}", clientId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archivedAt").isNotEmpty());
  }
}
