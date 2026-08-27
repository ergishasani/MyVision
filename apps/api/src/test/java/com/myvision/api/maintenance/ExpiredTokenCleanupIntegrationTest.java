package com.myvision.api.maintenance;

import com.fasterxml.jackson.databind.JsonNode;
import com.myvision.api.AbstractIntegrationTest;
import com.myvision.api.entity.EmailVerificationToken;
import com.myvision.api.entity.PasswordResetToken;
import com.myvision.api.entity.RefreshToken;
import com.myvision.api.repository.EmailVerificationTokenRepository;
import com.myvision.api.repository.PasswordResetTokenRepository;
import com.myvision.api.repository.RefreshTokenRepository;
import com.myvision.api.service.ExpiredTokenCleanupService;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Token cleanup. The important property is not just that expired rows go, but that live ones stay:
 * an over-eager purge would sign every active session out.
 */
class ExpiredTokenCleanupIntegrationTest extends AbstractIntegrationTest {

  @Autowired
  private ExpiredTokenCleanupService cleanupService;

  @Autowired
  private RefreshTokenRepository refreshTokenRepository;

  @Autowired
  private PasswordResetTokenRepository passwordResetTokenRepository;

  @Autowired
  private EmailVerificationTokenRepository emailVerificationTokenRepository;

  @Test
  void expiredTokensAreRemovedAndLiveOnesAreKept() throws Exception {
    UUID userId = registerAndGetUserId("cleanup-1@myvision.dev", "Cleanup Co");

    OffsetDateTime longExpired = OffsetDateTime.now().minusDays(30);
    OffsetDateTime stillValid = OffsetDateTime.now().plusDays(30);

    saveRefreshToken(userId, "refresh-expired", longExpired);
    saveRefreshToken(userId, "refresh-live", stillValid);
    savePasswordResetToken(userId, "reset-expired", longExpired);
    savePasswordResetToken(userId, "reset-live", stillValid);
    saveEmailVerificationToken(userId, "verify-expired", longExpired);
    saveEmailVerificationToken(userId, "verify-live", stillValid);

    ExpiredTokenCleanupService.CleanupSummary summary =
        cleanupService.purgeExpiredBefore(OffsetDateTime.now());

    assertThat(summary.refreshTokens()).isGreaterThanOrEqualTo(1);
    assertThat(summary.passwordResetTokens()).isEqualTo(1);
    assertThat(summary.emailVerificationTokens()).isEqualTo(1);

    assertThat(refreshTokenRepository.findByTokenHash("refresh-expired")).isEmpty();
    assertThat(passwordResetTokenRepository.findByTokenHash("reset-expired")).isEmpty();
    assertThat(emailVerificationTokenRepository.findByTokenHash("verify-expired")).isEmpty();

    assertThat(refreshTokenRepository.findByTokenHash("refresh-live")).isPresent();
    assertThat(passwordResetTokenRepository.findByTokenHash("reset-live")).isPresent();
    assertThat(emailVerificationTokenRepository.findByTokenHash("verify-live")).isPresent();
  }

  @Test
  void aCutoffBeforeEveryExpiryRemovesNothing() throws Exception {
    UUID userId = registerAndGetUserId("cleanup-2@myvision.dev", "Retention Co");
    saveRefreshToken(userId, "refresh-recent", OffsetDateTime.now().minusHours(1));

    // The retention window is what keeps a just-expired token on disk for investigation.
    ExpiredTokenCleanupService.CleanupSummary summary =
        cleanupService.purgeExpiredBefore(OffsetDateTime.now().minusDays(7));

    assertThat(summary.refreshTokens()).isZero();
    assertThat(refreshTokenRepository.findByTokenHash("refresh-recent")).isPresent();
  }

  private UUID registerAndGetUserId(String email, String companyName) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "fullName": "Test User",
                  "email": "%s",
                  "password": "Password123!",
                  "companyName": "%s"
                }
                """.formatted(email, companyName)))
        .andExpect(status().isOk())
        .andReturn();

    JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
    return UUID.fromString(body.get("user").get("id").asText());
  }

  private void saveRefreshToken(UUID userId, String hash, OffsetDateTime expiresAt) {
    RefreshToken token = new RefreshToken();
    token.setUserId(userId);
    token.setTokenHash(hash);
    token.setExpiresAt(expiresAt);
    refreshTokenRepository.save(token);
  }

  private void savePasswordResetToken(UUID userId, String hash, OffsetDateTime expiresAt) {
    PasswordResetToken token = new PasswordResetToken();
    token.setUserId(userId);
    token.setTokenHash(hash);
    token.setExpiresAt(expiresAt);
    passwordResetTokenRepository.save(token);
  }

  private void saveEmailVerificationToken(UUID userId, String hash, OffsetDateTime expiresAt) {
    EmailVerificationToken token = new EmailVerificationToken();
    token.setUserId(userId);
    token.setTokenHash(hash);
    token.setExpiresAt(expiresAt);
    emailVerificationTokenRepository.save(token);
  }
}
