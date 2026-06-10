package com.myvision.api.auth;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthIntegrationTest extends AbstractIntegrationTest {

  @Test
  void healthEndpointIsPublic() throws Exception {
    mockMvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("ok"))
        .andExpect(jsonPath("$.service").value("myvision-api"));
  }

  @Test
  void registerCreatesUserCompanyAndReturnsToken() throws Exception {
    mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "fullName": "Test Owner",
                  "email": "register-test@myvision.dev",
                  "password": "Password123!",
                  "companyName": "Test Construction GmbH"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(jsonPath("$.user.email").value("register-test@myvision.dev"))
        .andExpect(jsonPath("$.user.fullName").value("Test Owner"))
        .andExpect(jsonPath("$.company.name").value("Test Construction GmbH"));
  }

  @Test
  void registerRejectsDuplicateEmail() throws Exception {
    registerAndGetToken("duplicate@myvision.dev", "First Company");

    mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "fullName": "Someone Else",
                  "email": "duplicate@myvision.dev",
                  "password": "Password123!",
                  "companyName": "Second Company"
                }
                """))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }

  @Test
  void loginReturnsTokenForValidCredentials() throws Exception {
    registerAndGetToken("login-test@myvision.dev", "Login Co");

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "email": "login-test@myvision.dev",
                  "password": "Password123!"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(jsonPath("$.company.name").value("Login Co"));
  }

  @Test
  void loginRejectsWrongPassword() throws Exception {
    registerAndGetToken("badpass@myvision.dev", "BadPass Co");

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "email": "badpass@myvision.dev",
                  "password": "WrongPassword!"
                }
                """))
        .andExpect(status().isUnauthorized())
        .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
  }

  @Test
  void meReturnsCurrentUserAndCompany() throws Exception {
    String token = registerAndGetToken("me-test@myvision.dev", "Me Co");

    mockMvc.perform(get("/api/auth/me")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.user.email").value("me-test@myvision.dev"))
        .andExpect(jsonPath("$.company.name").value("Me Co"));
  }

  @Test
  void protectedEndpointRequiresToken() throws Exception {
    mockMvc.perform(get("/api/clients"))
        .andExpect(status().isUnauthorized());
  }
}
