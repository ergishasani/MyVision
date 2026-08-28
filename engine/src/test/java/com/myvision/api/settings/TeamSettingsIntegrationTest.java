package com.myvision.api.settings;

import com.myvision.api.AbstractIntegrationTest;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Team membership.
 *
 * <p>The guards here exist because both failure modes lock a business out of its own books: a
 * company with no owner left, or someone who has just demoted themselves.
 */
class TeamSettingsIntegrationTest extends AbstractIntegrationTest {

  @Test
  void theFounderIsListedAsOwner() throws Exception {
    String token = registerAndGetToken("team-list@myvision.dev", "Team Co");

    mockMvc.perform(get("/api/settings/team/members").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].email").value("team-list@myvision.dev"))
        .andExpect(jsonPath("$[0].role").value("owner"));
  }

  @Test
  void theLastOwnerCannotDemoteThemselves() throws Exception {
    String token = registerAndGetToken("team-demote@myvision.dev", "Demote Co");

    MvcResult listed = mockMvc.perform(get("/api/settings/team/members")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn();
    JsonNode members = objectMapper.readTree(listed.getResponse().getContentAsString());
    String memberId = members.get(0).get("id").asText();

    // Otherwise the workspace is left with nobody who can restore access to it.
    mockMvc.perform(patch("/api/settings/team/members/{id}", memberId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"role\":\"member\"}"))
        .andExpect(status().isBadRequest());

    mockMvc.perform(get("/api/settings/team/members").header("Authorization", "Bearer " + token))
        .andExpect(jsonPath("$[0].role").value("owner"));
  }

  @Test
  void youCannotRemoveYourself() throws Exception {
    String token = registerAndGetToken("team-self@myvision.dev", "Self Removal Co");

    MvcResult listed = mockMvc.perform(get("/api/settings/team/members")
            .header("Authorization", "Bearer " + token))
        .andReturn();
    String memberId = objectMapper.readTree(listed.getResponse().getContentAsString())
        .get(0).get("id").asText();

    mockMvc.perform(delete("/api/settings/team/members/{id}", memberId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isBadRequest());
  }

  @Test
  void anotherCompanysMembersAreNotReachable() throws Exception {
    String owner = registerAndGetToken("team-owner@myvision.dev", "Team Owner Co");
    String stranger = registerAndGetToken("team-stranger@myvision.dev", "Team Stranger Co");

    MvcResult listed = mockMvc.perform(get("/api/settings/team/members")
            .header("Authorization", "Bearer " + owner))
        .andReturn();
    String memberId = objectMapper.readTree(listed.getResponse().getContentAsString())
        .get(0).get("id").asText();

    mockMvc.perform(patch("/api/settings/team/members/{id}", memberId)
            .header("Authorization", "Bearer " + stranger)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"role\":\"member\"}"))
        .andExpect(status().isNotFound());

    // And a stranger's own listing shows only their own company.
    mockMvc.perform(get("/api/settings/team/members").header("Authorization", "Bearer " + stranger))
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].email").value("team-stranger@myvision.dev"));
  }
}
