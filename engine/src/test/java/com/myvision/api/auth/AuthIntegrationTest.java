package com.myvision.api.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.myvision.api.AbstractIntegrationTest;
import com.myvision.api.entity.EmailVerificationToken;
import com.myvision.api.entity.User;
import com.myvision.api.repository.EmailVerificationTokenRepository;
import com.myvision.api.repository.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.OffsetDateTime;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthIntegrationTest extends AbstractIntegrationTest {

  @Autowired
  private UserRepository userRepository;

  @Autowired
  private EmailVerificationTokenRepository emailVerificationTokenRepository;

  @BeforeEach
  void cleanVerificationTokens() {
    emailVerificationTokenRepository.deleteAll();
  }

  @Test
  void healthEndpointIsPublic() throws Exception {
    mockMvc.perform(get("/api/health"))
        .andExpect(status().isOk())
        .andExpect(header().string("X-Request-Id", startsWith("")))
        .andExpect(jsonPath("$.status").value("ok"))
        .andExpect(jsonPath("$.service").value("myvision-api"));
  }

  @Test
  void actuatorHealthEndpointIsPublic() throws Exception {
    mockMvc.perform(get("/actuator/health"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").isNotEmpty());
  }

  @Test
  void docsRequireAuthentication() throws Exception {
    mockMvc.perform(get("/v3/api-docs"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  void corsAllowsConfiguredFrontendOrigin() throws Exception {
    mockMvc.perform(options("/api/clients")
            .header("Origin", "http://localhost:3000")
            .header("Access-Control-Request-Method", "GET"))
        .andExpect(status().isOk())
        .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
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
  void registerWithoutCompanyNameDerivesCompanyFromFullName() throws Exception {
    mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "fullName": "Solo Trader",
                  "email": "no-company@myvision.dev",
                  "password": "Password123!"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(jsonPath("$.user.email").value("no-company@myvision.dev"))
        .andExpect(jsonPath("$.company.name").value("Solo Trader's Company"));
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
  void passwordResetTokenCanResetPasswordOnce() throws Exception {
    registerAndGetToken("reset-test@myvision.dev", "Reset Co");

    MvcResult forgotResult = mockMvc.perform(post("/api/auth/forgot-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"email\":\"reset-test@myvision.dev\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andReturn();
    String resetToken = objectMapper.readTree(forgotResult.getResponse().getContentAsString())
        .get("token")
        .asText();

    mockMvc.perform(post("/api/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "token": "%s",
                  "password": "NewPassword123!"
                }
                """.formatted(resetToken)))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/auth/login")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "email": "reset-test@myvision.dev",
                  "password": "NewPassword123!"
                }
                """))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty());

    mockMvc.perform(post("/api/auth/reset-password")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "token": "%s",
                  "password": "AnotherPassword123!"
                }
                """.formatted(resetToken)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void emailVerificationTokenMarksUserVerifiedOnce() throws Exception {
    MvcResult registerResult = mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "fullName": "Verify User",
                  "email": "verify-test@myvision.dev",
                  "password": "Password123!",
                  "companyName": "Verify Co"
                }
                """))
        .andExpect(status().isOk())
        .andReturn();
    JsonNode body = objectMapper.readTree(registerResult.getResponse().getContentAsString());
    String userId = body.get("user").get("id").asText();
    String rawVerificationToken = "test-verification-token";

    User user = userRepository.findById(java.util.UUID.fromString(userId)).orElseThrow();
    EmailVerificationToken token = new EmailVerificationToken();
    token.setUserId(user.getId());
    token.setTokenHash(hash(rawVerificationToken));
    token.setExpiresAt(OffsetDateTime.now().plusHours(1));
    emailVerificationTokenRepository.save(token);

    mockMvc.perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"token\":\"%s\"}".formatted(rawVerificationToken)))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/auth/verify-email")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"token\":\"%s\"}".formatted(rawVerificationToken)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void meReturnsCurrentUserAndCompany() throws Exception {
    String token = registerAndGetToken("me-test@myvision.dev", "Me Co");

    mockMvc.perform(get("/api/auth/me")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.token").isNotEmpty())
        .andExpect(jsonPath("$.user.email").value("me-test@myvision.dev"))
        .andExpect(jsonPath("$.company.name").value("Me Co"));
  }

  @Test
  void protectedEndpointRequiresToken() throws Exception {
    mockMvc.perform(get("/api/clients"))
        .andExpect(status().isUnauthorized());
  }

  private String hash(String token) throws Exception {
    byte[] digest = MessageDigest.getInstance("SHA-256")
        .digest(token.getBytes(StandardCharsets.UTF_8));
    return Base64.getEncoder().encodeToString(digest);
  }
}
