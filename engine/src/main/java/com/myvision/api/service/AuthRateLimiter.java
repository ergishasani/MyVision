package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.exception.BadRequestException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthRateLimiter {

  private final Map<String, Deque<Instant>> attempts = new ConcurrentHashMap<>();
  private final int maxAttempts;
  private final Duration window;

  public AuthRateLimiter(
      @Value("${auth.rate-limit.max-attempts}") int maxAttempts,
      @Value("${auth.rate-limit.window-ms}") long windowMs
  ) {
    this.maxAttempts = maxAttempts;
    this.window = Duration.ofMillis(windowMs);
  }

  public void check(String action, String identity, String remoteAddress) {
    String key = "%s:%s:%s".formatted(
        action,
        identity == null ? "unknown" : identity.toLowerCase(Locale.ROOT),
        remoteAddress == null ? "unknown" : remoteAddress
    );
    Instant now = Instant.now();
    Deque<Instant> bucket = attempts.computeIfAbsent(key, ignored -> new ArrayDeque<>());

    synchronized (bucket) {
      while (!bucket.isEmpty() && bucket.peekFirst().plus(window).isBefore(now)) {
        bucket.removeFirst();
      }
      if (bucket.size() >= maxAttempts) {
        throw new BadRequestException("Too many attempts. Please wait and try again.");
      }
      bucket.addLast(now);
    }
  }
}

