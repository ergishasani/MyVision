package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.exception.BadRequestException;
import com.myvision.api.exception.UnauthorizedException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TokenService {

  private final RefreshTokenRepository refreshTokenRepository;
  private final PasswordResetTokenRepository passwordResetTokenRepository;
  private final EmailVerificationTokenRepository emailVerificationTokenRepository;
  private final SecureRandom secureRandom = new SecureRandom();
  private final Duration refreshTokenTtl;
  private final Duration passwordResetTtl;
  private final Duration emailVerificationTtl;

  public TokenService(
      RefreshTokenRepository refreshTokenRepository,
      PasswordResetTokenRepository passwordResetTokenRepository,
      EmailVerificationTokenRepository emailVerificationTokenRepository,
      @Value("${auth.refresh-token-expiration-ms}") long refreshTokenExpirationMs,
      @Value("${auth.password-reset-expiration-ms}") long passwordResetExpirationMs,
      @Value("${auth.email-verification-expiration-ms}") long emailVerificationExpirationMs
  ) {
    this.refreshTokenRepository = refreshTokenRepository;
    this.passwordResetTokenRepository = passwordResetTokenRepository;
    this.emailVerificationTokenRepository = emailVerificationTokenRepository;
    this.refreshTokenTtl = Duration.ofMillis(refreshTokenExpirationMs);
    this.passwordResetTtl = Duration.ofMillis(passwordResetExpirationMs);
    this.emailVerificationTtl = Duration.ofMillis(emailVerificationExpirationMs);
  }

  @Transactional
  public IssuedRefreshToken issueRefreshToken(User user) {
    String rawToken = randomToken();
    RefreshToken token = new RefreshToken();
    token.setUserId(user.getId());
    token.setTokenHash(hash(rawToken));
    token.setExpiresAt(OffsetDateTime.now().plus(refreshTokenTtl));
    token = refreshTokenRepository.save(token);
    return new IssuedRefreshToken(rawToken, token.getExpiresAt());
  }

  @Transactional
  public RefreshToken consumeRefreshToken(String rawToken) {
    RefreshToken token = refreshTokenRepository.findByTokenHash(hash(rawToken))
        .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

    OffsetDateTime now = OffsetDateTime.now();
    if (token.getRevokedAt() != null || token.getExpiresAt().isBefore(now)) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    token.setRevokedAt(now);
    return refreshTokenRepository.save(token);
  }

  @Transactional
  public void linkReplacement(RefreshToken consumedToken, IssuedRefreshToken replacement) {
    refreshTokenRepository.findByTokenHash(hash(replacement.token()))
        .ifPresent(saved -> {
          consumedToken.setReplacedByTokenId(saved.getId());
          refreshTokenRepository.save(consumedToken);
        });
  }

  @Transactional
  public void revokeRefreshToken(String rawToken) {
    refreshTokenRepository.findByTokenHash(hash(rawToken))
        .ifPresent(token -> {
          token.setRevokedAt(OffsetDateTime.now());
          refreshTokenRepository.save(token);
        });
  }

  @Transactional
  public String issuePasswordResetToken(User user) {
    String rawToken = randomToken();
    PasswordResetToken token = new PasswordResetToken();
    token.setUserId(user.getId());
    token.setTokenHash(hash(rawToken));
    token.setExpiresAt(OffsetDateTime.now().plus(passwordResetTtl));
    passwordResetTokenRepository.save(token);
    return rawToken;
  }

  @Transactional
  public PasswordResetToken consumePasswordResetToken(String rawToken) {
    PasswordResetToken token = passwordResetTokenRepository.findByTokenHash(hash(rawToken))
        .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));
    OffsetDateTime now = OffsetDateTime.now();
    if (token.getUsedAt() != null || token.getExpiresAt().isBefore(now)) {
      throw new BadRequestException("Invalid or expired reset token");
    }
    token.setUsedAt(now);
    return passwordResetTokenRepository.save(token);
  }

  @Transactional
  public String issueEmailVerificationToken(User user) {
    String rawToken = randomToken();
    EmailVerificationToken token = new EmailVerificationToken();
    token.setUserId(user.getId());
    token.setTokenHash(hash(rawToken));
    token.setExpiresAt(OffsetDateTime.now().plus(emailVerificationTtl));
    emailVerificationTokenRepository.save(token);
    return rawToken;
  }

  @Transactional
  public EmailVerificationToken consumeEmailVerificationToken(String rawToken) {
    EmailVerificationToken token = emailVerificationTokenRepository.findByTokenHash(hash(rawToken))
        .orElseThrow(() -> new BadRequestException("Invalid or expired verification token"));
    OffsetDateTime now = OffsetDateTime.now();
    if (token.getUsedAt() != null || token.getExpiresAt().isBefore(now)) {
      throw new BadRequestException("Invalid or expired verification token");
    }
    token.setUsedAt(now);
    return emailVerificationTokenRepository.save(token);
  }

  private String randomToken() {
    byte[] bytes = new byte[48];
    secureRandom.nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  private String hash(String token) {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256")
          .digest(token.getBytes(StandardCharsets.UTF_8));
      return Base64.getEncoder().encodeToString(digest);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is not available", exception);
    }
  }

  public record IssuedRefreshToken(String token, OffsetDateTime expiresAt) {
  }
}

