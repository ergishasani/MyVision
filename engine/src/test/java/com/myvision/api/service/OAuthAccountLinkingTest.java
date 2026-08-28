package com.myvision.api.service;

import com.myvision.api.entity.AuthProvider;
import com.myvision.api.entity.User;
import com.myvision.api.exception.BadRequestException;
import java.time.OffsetDateTime;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Rules for attaching a social identity to an account that already exists under the same email.
 *
 * <p>The interesting case is not the happy path but the attack it has to survive: account
 * pre-hijacking, where someone registers a victim's address with a password and waits for the
 * victim to sign in with Google so the accounts merge.
 */
class OAuthAccountLinkingTest {

  private static User localUser(String passwordHash, boolean emailVerified) {
    User user = new User();
    user.setEmail("owner@example.com");
    user.setAuthProvider(AuthProvider.local);
    user.setPasswordHash(passwordHash);
    user.setEmailVerifiedAt(emailVerified ? OffsetDateTime.now() : null);
    return user;
  }

  private static OAuthProfile google(boolean emailVerified) {
    return new OAuthProfile("google-subject-1", "owner@example.com", "Owner", emailVerified);
  }

  @Test
  void anUnverifiedProviderEmailIsNeverLinked() {
    User user = localUser("$2a$10$existinghash", false);

    // The provider asserting an address it has not verified proves nothing about ownership.
    assertThatThrownBy(() -> AuthService.linkOAuthIdentity(user, AuthProvider.google, google(false)))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("has not verified it");

    assertThat(user.getAuthProvider()).isEqualTo(AuthProvider.local);
    assertThat(user.getPasswordHash()).isNotNull();
  }

  @Test
  void linkingAnUnverifiedAccountDiscardsItsPassword() {
    User user = localUser("$2a$10$attackerchosenhash", false);

    AuthService.linkOAuthIdentity(user, AuthProvider.google, google(true));

    assertThat(user.getAuthProvider()).isEqualTo(AuthProvider.google);
    assertThat(user.getProviderSubject()).isEqualTo("google-subject-1");
    // The whole point: a password set on an address nobody proved they owned must not survive the
    // link, or pre-hijacking works.
    assertThat(user.getPasswordHash()).isNull();
  }

  @Test
  void linkingAVerifiedAccountKeepsItsPassword() {
    User user = localUser("$2a$10$ownerchosenhash", true);

    AuthService.linkOAuthIdentity(user, AuthProvider.google, google(true));

    assertThat(user.getAuthProvider()).isEqualTo(AuthProvider.google);
    // Both sides proved control of the same mailbox, so both sign-in methods stay usable.
    assertThat(user.getPasswordHash()).isEqualTo("$2a$10$ownerchosenhash");
  }

  @Test
  void appleLinksOnTheSameTerms() {
    User user = localUser("$2a$10$existinghash", true);
    OAuthProfile apple = new OAuthProfile("apple-subject-1", "owner@example.com", "Owner", true);

    AuthService.linkOAuthIdentity(user, AuthProvider.apple, apple);

    assertThat(user.getAuthProvider()).isEqualTo(AuthProvider.apple);
    assertThat(user.getProviderSubject()).isEqualTo("apple-subject-1");
    assertThat(user.getPasswordHash()).isNotNull();
  }
}
