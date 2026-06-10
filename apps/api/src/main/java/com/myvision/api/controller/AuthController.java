package com.myvision.api.controller;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.exception.UnauthorizedException;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "Registration, login and current user/company info")
public class AuthController {

  private final AuthService authService;
  private final AuthRateLimiter authRateLimiter;

  public AuthController(AuthService authService, AuthRateLimiter authRateLimiter) {
    this.authService = authService;
    this.authRateLimiter = authRateLimiter;
  }

  @PostMapping("/register")
  public AuthResponse register(
      @Valid @RequestBody RegisterRequest request,
      HttpServletRequest servletRequest
  ) {
    authRateLimiter.check("register", request.email(), servletRequest.getRemoteAddr());
    return authService.register(request);
  }

  @PostMapping("/login")
  public AuthResponse login(
      @Valid @RequestBody LoginRequest request,
      HttpServletRequest servletRequest
  ) {
    authRateLimiter.check("login", request.email(), servletRequest.getRemoteAddr());
    return authService.login(request);
  }

  @PostMapping("/refresh")
  public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
    return authService.refresh(request);
  }

  @PostMapping("/logout")
  public MessageResponse logout(@Valid @RequestBody LogoutRequest request) {
    authService.logout(request);
    return MessageResponse.of("Logged out");
  }

  @PostMapping("/forgot-password")
  public MessageResponse forgotPassword(
      @Valid @RequestBody ForgotPasswordRequest request,
      HttpServletRequest servletRequest
  ) {
    authRateLimiter.check("forgot-password", request.email(), servletRequest.getRemoteAddr());
    return authService.forgotPassword(request);
  }

  @PostMapping("/reset-password")
  public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
    authService.resetPassword(request);
    return MessageResponse.of("Password reset");
  }

  @PostMapping("/verify-email")
  public MessageResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
    authService.verifyEmail(request);
    return MessageResponse.of("Email verified");
  }

  @GetMapping("/me")
  public AuthResponse me(@AuthenticationPrincipal CurrentUserPrincipal principal) {
    if (principal == null) {
      throw new UnauthorizedException("Authentication required");
    }

    return authService.me(principal.getUserId());
  }
}
