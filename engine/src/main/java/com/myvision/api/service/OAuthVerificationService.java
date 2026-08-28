package com.myvision.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.myvision.api.exception.BadRequestException;
import com.nimbusds.jose.JWSVerifier;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jose.jwk.JWK;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jwt.SignedJWT;
import java.net.URI;
import java.time.Instant;
import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Service
public class OAuthVerificationService {

  private static final URI APPLE_JWKS_URI = URI.create("https://appleid.apple.com/auth/keys");
  private static final String APPLE_ISSUER = "https://appleid.apple.com";

  private final RestClient restClient;
  private final Set<String> googleClientIds;
  private final String appleClientId;

  public OAuthVerificationService(
      RestClient.Builder restClientBuilder,
      @Value("${auth.oauth.google-client-ids:}") String googleClientIds,
      @Value("${auth.oauth.apple-client-id:}") String appleClientId
  ) {
    this.restClient = restClientBuilder.build();
    this.googleClientIds = Arrays.stream(googleClientIds.split(","))
        .map(String::trim)
        .filter(value -> !value.isBlank())
        .collect(Collectors.toSet());
    this.appleClientId = appleClientId == null ? "" : appleClientId.trim();
  }

  public OAuthProfile verifyGoogleIdToken(String idToken) {
    if (googleClientIds.isEmpty()) {
      throw new BadRequestException("Google sign-in is not configured");
    }

    JsonNode payload;
    try {
      payload = restClient.get()
          .uri("https://oauth2.googleapis.com/tokeninfo?id_token={token}", idToken)
          .retrieve()
          .body(JsonNode.class);
    } catch (RestClientException exception) {
      throw new BadRequestException("Invalid Google sign-in token");
    }

    if (payload == null || payload.hasNonNull("error")) {
      throw new BadRequestException("Invalid Google sign-in token");
    }

    String audience = textValue(payload, "aud");
    if (audience == null || !googleClientIds.contains(audience)) {
      throw new BadRequestException("Google sign-in token audience is not allowed");
    }

    String subject = textValue(payload, "sub");
    String email = textValue(payload, "email");
    if (subject == null || subject.isBlank() || email == null || email.isBlank()) {
      throw new BadRequestException("Google account is missing required profile information");
    }

    boolean emailVerified = "true".equalsIgnoreCase(textValue(payload, "email_verified"));
    String fullName = textValue(payload, "name");
    if (fullName == null || fullName.isBlank()) {
      fullName = email.substring(0, email.indexOf('@'));
    }

    return new OAuthProfile(subject, email.toLowerCase(Locale.ROOT), fullName.trim(), emailVerified);
  }

  public OAuthProfile verifyAppleIdentityToken(String identityToken, String fallbackFullName) {
    if (appleClientId.isBlank()) {
      throw new BadRequestException("Apple sign-in is not configured");
    }

    try {
      SignedJWT signedJwt = SignedJWT.parse(identityToken);
      if (!verifyAppleSignature(signedJwt)) {
        throw new BadRequestException("Invalid Apple sign-in token");
      }

      var claims = signedJwt.getJWTClaimsSet();
      String issuer = claims.getIssuer();
      if (!APPLE_ISSUER.equals(issuer)) {
        throw new BadRequestException("Invalid Apple sign-in token issuer");
      }

      Object audience = claims.getAudience() == null || claims.getAudience().isEmpty()
          ? null
          : claims.getAudience().get(0);
      if (!appleClientId.equals(audience)) {
        throw new BadRequestException("Apple sign-in token audience is not allowed");
      }

      Instant expiresAt = claims.getExpirationTime().toInstant();
      if (expiresAt.isBefore(Instant.now())) {
        throw new BadRequestException("Apple sign-in token has expired");
      }

      String subject = claims.getSubject();
      String email = claims.getStringClaim("email");
      if (subject == null || subject.isBlank()) {
        throw new BadRequestException("Apple account is missing required profile information");
      }

      boolean emailVerified = Boolean.TRUE.equals(claims.getBooleanClaim("email_verified"));
      String fullName = fallbackFullName;
      if (fullName == null || fullName.isBlank()) {
        fullName = email != null && email.contains("@")
            ? email.substring(0, email.indexOf('@'))
            : "Apple User";
      }

      if (email == null || email.isBlank()) {
        email = subject + "@privaterelay.appleid.com";
        emailVerified = false;
      }

      return new OAuthProfile(
          subject,
          email.toLowerCase(Locale.ROOT),
          fullName.trim(),
          emailVerified
      );
    } catch (BadRequestException exception) {
      throw exception;
    } catch (Exception exception) {
      throw new BadRequestException("Invalid Apple sign-in token");
    }
  }

  private boolean verifyAppleSignature(SignedJWT signedJwt) throws Exception {
    JWKSet jwkSet = JWKSet.load(APPLE_JWKS_URI.toURL());
    String keyId = signedJwt.getHeader().getKeyID();
    JWK jwk = jwkSet.getKeyByKeyId(keyId);
    if (jwk == null) {
      return false;
    }

    JWSVerifier verifier = new RSASSAVerifier(jwk.toRSAKey().toRSAPublicKey());
    return signedJwt.verify(verifier);
  }

  private String textValue(JsonNode payload, String field) {
    JsonNode node = payload.get(field);
    return node == null || node.isNull() ? null : node.asText();
  }
}
