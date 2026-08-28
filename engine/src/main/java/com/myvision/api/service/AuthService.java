package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.exception.BadRequestException;
import com.myvision.api.exception.ResourceNotFoundException;
import com.myvision.api.exception.UnauthorizedException;
import com.myvision.api.entity.Company;
import com.myvision.api.entity.CompanyMember;
import com.myvision.api.repository.CompanyMemberRepository;
import com.myvision.api.entity.CompanyMemberRole;
import com.myvision.api.repository.CompanyRepository;
import com.myvision.api.dto.CompanyResponse;
import com.myvision.api.entity.CompanySettings;
import com.myvision.api.repository.CompanySettingsRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

  private final UserRepository userRepository;
  private final CompanyRepository companyRepository;
  private final CompanyMemberRepository companyMemberRepository;
  private final CompanySettingsRepository companySettingsRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final TokenService tokenService;
  private final EmailService emailService;
  private final OAuthVerificationService oauthVerificationService;
  private final boolean returnSensitiveTokens;
  private final String frontendBaseUrl;

  public AuthService(
      UserRepository userRepository,
      CompanyRepository companyRepository,
      CompanyMemberRepository companyMemberRepository,
      CompanySettingsRepository companySettingsRepository,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      TokenService tokenService,
      EmailService emailService,
      OAuthVerificationService oauthVerificationService,
      @Value("${auth.return-sensitive-tokens:false}") boolean returnSensitiveTokens,
      @Value("${auth.frontend-base-url}") String frontendBaseUrl
  ) {
    this.userRepository = userRepository;
    this.companyRepository = companyRepository;
    this.companyMemberRepository = companyMemberRepository;
    this.companySettingsRepository = companySettingsRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.tokenService = tokenService;
    this.emailService = emailService;
    this.oauthVerificationService = oauthVerificationService;
    this.returnSensitiveTokens = returnSensitiveTokens;
    this.frontendBaseUrl = frontendBaseUrl.replaceAll("/+$", "");
  }

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    String email = normalizeEmail(request.email());
    if (userRepository.existsByEmail(email)) {
      throw new BadRequestException("A user with this email already exists");
    }

    User user = new User();
    user.setFullName(request.fullName().trim());
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setStatus(UserStatus.active);
    user = userRepository.save(user);

    Company company = new Company();
    company.setName(request.companyName().trim());
    company.setEmail(email);
    company = companyRepository.save(company);

    CompanySettings settings = new CompanySettings();
    settings.setCompany(company);
    companySettingsRepository.save(settings);

    CompanyMember member = new CompanyMember();
    member.setUser(user);
    member.setCompany(company);
    member.setRole(CompanyMemberRole.owner);
    companyMemberRepository.save(member);
    String verificationToken = tokenService.issueEmailVerificationToken(user);
    emailService.sendEmailVerificationEmail(
        user.getEmail(),
        frontendBaseUrl + "/verify-email?token=" + urlEncode(verificationToken));

    return responseWithToken(user, company);
  }

  @Transactional
  public AuthResponse login(LoginRequest request) {
    String email = normalizeEmail(request.email());
    User user = userRepository.findByEmail(email)
        .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

    if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
      throw new UnauthorizedException("This account uses social sign-in");
    }

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new UnauthorizedException("Invalid email or password");
    }

    user.setLastLoginAt(OffsetDateTime.now());
    userRepository.save(user);

    Company company = currentCompanyForUser(user.getId());
    return responseWithToken(user, company);
  }

  @Transactional(readOnly = true)
  public AuthResponse me(UUID userId) {
    User user = userRepository.findById(userId)
        .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    Company company = currentCompanyForUser(user.getId());
    return responseWithToken(user, company);
  }

  @Transactional
  public AuthResponse refresh(RefreshRequest request) {
    RefreshToken consumedToken = tokenService.consumeRefreshToken(request.refreshToken());
    User user = userRepository.findById(consumedToken.getUserId())
        .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));
    Company company = currentCompanyForUser(user.getId());
    AuthResponse response = responseWithToken(user, company);
    tokenService.linkReplacement(
        consumedToken,
        new TokenService.IssuedRefreshToken(response.refreshToken(), null)
    );
    return response;
  }

  @Transactional
  public void logout(LogoutRequest request) {
    tokenService.revokeRefreshToken(request.refreshToken());
  }

  @Transactional
  public MessageResponse forgotPassword(ForgotPasswordRequest request) {
    String email = normalizeEmail(request.email());
    return userRepository.findByEmail(email)
        .map(user -> {
          String token = tokenService.issuePasswordResetToken(user);
          emailService.sendPasswordResetEmail(
              user.getEmail(),
              frontendBaseUrl + "/reset-password?token=" + urlEncode(token));
          return returnSensitiveTokens
              ? MessageResponse.withToken("If that email exists, a reset link will be sent.", token)
              : MessageResponse.of("If that email exists, a reset link will be sent.");
        })
        .orElseGet(() -> MessageResponse.of("If that email exists, a reset link will be sent."));
  }

  @Transactional
  public void resetPassword(ResetPasswordRequest request) {
    PasswordResetToken resetToken = tokenService.consumePasswordResetToken(request.token());
    User user = userRepository.findById(resetToken.getUserId())
        .orElseThrow(() -> new BadRequestException("Invalid or expired reset token"));
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setPasswordChangedAt(OffsetDateTime.now());
    userRepository.save(user);
  }

  @Transactional
  public AuthResponse loginWithGoogle(GoogleAuthRequest request) {
    OAuthProfile profile = oauthVerificationService.verifyGoogleIdToken(request.idToken());
    return authenticateWithOAuth(AuthProvider.google, profile, request.companyName());
  }

  @Transactional
  public AuthResponse loginWithApple(AppleAuthRequest request) {
    OAuthProfile profile = oauthVerificationService.verifyAppleIdentityToken(
        request.identityToken(),
        request.fullName()
    );
    return authenticateWithOAuth(AuthProvider.apple, profile, request.companyName());
  }

  @Transactional
  public void verifyEmail(VerifyEmailRequest request) {
    EmailVerificationToken verificationToken =
        tokenService.consumeEmailVerificationToken(request.token());
    User user = userRepository.findById(verificationToken.getUserId())
        .orElseThrow(() -> new BadRequestException("Invalid or expired verification token"));
    user.setEmailVerifiedAt(OffsetDateTime.now());
    userRepository.save(user);
  }

  private AuthResponse authenticateWithOAuth(
      AuthProvider provider,
      OAuthProfile profile,
      String companyName
  ) {
    User user = userRepository.findByAuthProviderAndProviderSubject(provider, profile.subject())
        .orElseGet(() -> userRepository.findByEmail(profile.email()).orElse(null));

    if (user != null) {
      if (user.getAuthProvider() != provider) {
        throw new BadRequestException("This email already uses a different sign-in method");
      }
      if (user.getProviderSubject() == null || !user.getProviderSubject().equals(profile.subject())) {
        user.setProviderSubject(profile.subject());
      }
      if (profile.fullName() != null && !profile.fullName().isBlank()) {
        user.setFullName(profile.fullName());
      }
      if (profile.emailVerified() && user.getEmailVerifiedAt() == null) {
        user.setEmailVerifiedAt(OffsetDateTime.now());
      }
      user.setLastLoginAt(OffsetDateTime.now());
      userRepository.save(user);
      Company company = currentCompanyForUser(user.getId());
      return responseWithToken(user, company);
    }

    return createOAuthUser(provider, profile, companyName);
  }

  private AuthResponse createOAuthUser(
      AuthProvider provider,
      OAuthProfile profile,
      String companyName
  ) {
    if (userRepository.existsByEmail(profile.email())) {
      throw new BadRequestException("This email already uses a different sign-in method");
    }

    User user = new User();
    user.setFullName(profile.fullName());
    user.setEmail(profile.email());
    user.setAuthProvider(provider);
    user.setProviderSubject(profile.subject());
    user.setStatus(UserStatus.active);
    user.setLastLoginAt(OffsetDateTime.now());
    if (profile.emailVerified()) {
      user.setEmailVerifiedAt(OffsetDateTime.now());
    }
    user = userRepository.save(user);

    String resolvedCompanyName = companyName == null || companyName.isBlank()
        ? profile.fullName() + "'s Company"
        : companyName.trim();

    Company company = new Company();
    company.setName(resolvedCompanyName);
    company.setEmail(profile.email());
    company = companyRepository.save(company);

    CompanySettings settings = new CompanySettings();
    settings.setCompany(company);
    companySettingsRepository.save(settings);

    CompanyMember member = new CompanyMember();
    member.setUser(user);
    member.setCompany(company);
    member.setRole(CompanyMemberRole.owner);
    companyMemberRepository.save(member);

    return responseWithToken(user, company);
  }

  private AuthResponse responseWithToken(User user, Company company) {
    TokenService.IssuedRefreshToken refreshToken = tokenService.issueRefreshToken(user);
    return new AuthResponse(
        jwtService.generateToken(user),
        refreshToken.token(),
        jwtService.getExpirationMs(),
        UserResponse.from(user),
        CompanyResponse.from(company)
    );
  }

  private Company currentCompanyForUser(UUID userId) {
    return companyMemberRepository.findFirstByUser_IdOrderByCreatedAtAsc(userId)
        .map(CompanyMember::getCompany)
        .orElseThrow(() -> new ResourceNotFoundException("Company membership not found"));
  }

  private String normalizeEmail(String email) {
    return email.trim().toLowerCase();
  }

  private String urlEncode(String value) {
    return URLEncoder.encode(value, StandardCharsets.UTF_8);
  }
}
