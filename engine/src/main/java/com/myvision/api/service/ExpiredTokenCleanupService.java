package com.myvision.api.service;

import com.myvision.api.repository.EmailVerificationTokenRepository;
import com.myvision.api.repository.PasswordResetTokenRepository;
import com.myvision.api.repository.RefreshTokenRepository;
import java.time.Duration;
import java.time.OffsetDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deletes authentication tokens that can no longer authenticate anything.
 *
 * <p>Refresh, password-reset and email-verification tokens were written and validated but never
 * removed. Nothing broke, but the refresh table grew on every single login, so the tables only
 * ever got bigger.
 *
 * <p>Rows are kept for a grace period past expiry rather than deleted the moment they lapse, so a
 * token that fails is still on disk while someone investigates why.
 */
@Service
public class ExpiredTokenCleanupService {

  private static final Logger log = LoggerFactory.getLogger(ExpiredTokenCleanupService.class);

  private final RefreshTokenRepository refreshTokenRepository;
  private final PasswordResetTokenRepository passwordResetTokenRepository;
  private final EmailVerificationTokenRepository emailVerificationTokenRepository;
  private final Duration retention;

  public ExpiredTokenCleanupService(
      RefreshTokenRepository refreshTokenRepository,
      PasswordResetTokenRepository passwordResetTokenRepository,
      EmailVerificationTokenRepository emailVerificationTokenRepository,
      @Value("${auth.token-cleanup.retention-days:7}") long retentionDays
  ) {
    this.refreshTokenRepository = refreshTokenRepository;
    this.passwordResetTokenRepository = passwordResetTokenRepository;
    this.emailVerificationTokenRepository = emailVerificationTokenRepository;
    this.retention = Duration.ofDays(retentionDays);
  }

  @Scheduled(cron = "${auth.token-cleanup.cron:0 30 3 * * *}")
  public void cleanupDaily() {
    CleanupSummary summary = purgeExpiredBefore(OffsetDateTime.now().minus(retention));
    if (summary.total() > 0) {
      log.info("Token cleanup removed {} expired token(s): {} refresh, {} password reset, {} email verification",
          summary.total(), summary.refreshTokens(), summary.passwordResetTokens(),
          summary.emailVerificationTokens());
    }
  }

  /** Deletes every token that expired before {@code cutoff}. Returns what was removed. */
  @Transactional
  public CleanupSummary purgeExpiredBefore(OffsetDateTime cutoff) {
    long refresh = refreshTokenRepository.deleteByExpiresAtBefore(cutoff);
    long passwordReset = passwordResetTokenRepository.deleteByExpiresAtBefore(cutoff);
    long emailVerification = emailVerificationTokenRepository.deleteByExpiresAtBefore(cutoff);
    return new CleanupSummary(refresh, passwordReset, emailVerification);
  }

  public record CleanupSummary(
      long refreshTokens,
      long passwordResetTokens,
      long emailVerificationTokens
  ) {
    public long total() {
      return refreshTokens + passwordResetTokens + emailVerificationTokens;
    }
  }
}
