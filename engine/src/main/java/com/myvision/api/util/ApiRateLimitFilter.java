package com.myvision.api.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myvision.api.dto.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class ApiRateLimitFilter extends OncePerRequestFilter {

  private final ObjectMapper objectMapper;
  private final boolean enabled;
  private final int maxRequests;
  private final Duration window;
  private final Map<String, Deque<Instant>> requests = new ConcurrentHashMap<>();

  public ApiRateLimitFilter(
      ObjectMapper objectMapper,
      @Value("${app.rate-limit.enabled}") boolean enabled,
      @Value("${app.rate-limit.max-requests}") int maxRequests,
      @Value("${app.rate-limit.window-ms}") long windowMs
  ) {
    this.objectMapper = objectMapper;
    this.enabled = enabled;
    this.maxRequests = maxRequests;
    this.window = Duration.ofMillis(windowMs);
  }

  @Override
  protected boolean shouldNotFilter(HttpServletRequest request) {
    String path = request.getRequestURI();
    return !enabled
        || !path.startsWith("/api/")
        || path.startsWith("/api/health")
        || path.startsWith("/api/auth/")
        // Stripe retries on any non-2xx. Throttling the webhook would turn a traffic spike into
        // a retry storm and delay payment reconciliation.
        || path.startsWith("/api/stripe/webhook");
  }

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    String key = "%s:%s".formatted(remoteAddress(request), request.getRequestURI());
    Instant now = Instant.now();
    Deque<Instant> bucket = requests.computeIfAbsent(key, ignored -> new ArrayDeque<>());

    synchronized (bucket) {
      while (!bucket.isEmpty() && bucket.peekFirst().plus(window).isBefore(now)) {
        bucket.removeFirst();
      }
      if (bucket.size() >= maxRequests) {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
            response.getOutputStream(),
            ApiError.of("Too many requests. Please wait and try again.", "RATE_LIMITED"));
        return;
      }
      bucket.addLast(now);
    }

    filterChain.doFilter(request, response);
  }

  private String remoteAddress(HttpServletRequest request) {
    String forwardedFor = request.getHeader("X-Forwarded-For");
    if (forwardedFor != null && !forwardedFor.isBlank()) {
      return forwardedFor.split(",")[0].trim();
    }
    return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
  }
}
