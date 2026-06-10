package com.myvision.api.project;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class ProjectIntegrationTest extends AbstractIntegrationTest {

  @Test
  void createProjectWithValidClient() throws Exception {
    String token = registerAndGetToken("projects-1@myvision.dev", "Projects Co 1");
    String clientId = createClient(token, "Project Client");

    mockMvc.perform(post("/api/projects")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  "name": "Office Renovation",
                  "status": "active",
                  "jobSiteCity": "Munich",
                  "startDate": "2026-07-01",
                  "endDate": "2026-09-30",
                  "budgetAmount": 25000.00
                }
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Office Renovation"))
        .andExpect(jsonPath("$.status").value("active"))
        .andExpect(jsonPath("$.clientId").value(clientId))
        .andExpect(jsonPath("$.currency").value("EUR"));
  }

  @Test
  void createProjectRejectsClientOfAnotherCompany() throws Exception {
    String tokenA = registerAndGetToken("projects-a@myvision.dev", "Projects Tenant A");
    String tokenB = registerAndGetToken("projects-b@myvision.dev", "Projects Tenant B");
    String foreignClientId = createClient(tokenA, "Client of A");

    mockMvc.perform(post("/api/projects")
            .header("Authorization", "Bearer " + tokenB)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  "name": "Should Fail"
                }
                """.formatted(foreignClientId)))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }
}
