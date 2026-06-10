package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

  private final String secret;
  private final long expirationMs;

  public JwtService(
      @Value("${jwt.secret}") String secret,
      @Value("${jwt.expiration-ms}") long expirationMs
  ) {
    this.secret = secret;
    this.expirationMs = expirationMs;
  }

  public String generateToken(User user) {
    Instant now = Instant.now();
    Instant expiresAt = now.plusMillis(expirationMs);

    return Jwts.builder()
        .subject(user.getId().toString())
        .claim("email", user.getEmail())
        .issuedAt(Date.from(now))
        .expiration(Date.from(expiresAt))
        .signWith(signingKey())
        .compact();
  }

  public UUID extractUserId(String token) {
    return UUID.fromString(claims(token).getSubject());
  }

  public boolean isTokenValid(String token) {
    try {
      claims(token);
      return true;
    } catch (JwtException | IllegalArgumentException exception) {
      return false;
    }
  }

  public long getExpirationMs() {
    return expirationMs;
  }

  private Claims claims(String token) {
    return Jwts.parser()
        .verifyWith(signingKey())
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }

  private SecretKey signingKey() {
    try {
      byte[] digest = MessageDigest.getInstance("SHA-256")
          .digest(secret.getBytes(StandardCharsets.UTF_8));
      return Keys.hmacShaKeyFor(digest);
    } catch (NoSuchAlgorithmException exception) {
      throw new IllegalStateException("SHA-256 is not available", exception);
    }
  }
}
