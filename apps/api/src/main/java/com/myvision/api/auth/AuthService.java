package com.myvision.api.auth;

import com.myvision.api.common.BadRequestException;
import com.myvision.api.common.ResourceNotFoundException;
import com.myvision.api.common.UnauthorizedException;
import com.myvision.api.company.Company;
import com.myvision.api.company.CompanyMember;
import com.myvision.api.company.CompanyMemberRepository;
import com.myvision.api.company.CompanyMemberRole;
import com.myvision.api.company.CompanyRepository;
import com.myvision.api.company.CompanyResponse;
import com.myvision.api.company.CompanySettings;
import com.myvision.api.company.CompanySettingsRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
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

  public AuthService(
      UserRepository userRepository,
      CompanyRepository companyRepository,
      CompanyMemberRepository companyMemberRepository,
      CompanySettingsRepository companySettingsRepository,
      PasswordEncoder passwordEncoder,
      JwtService jwtService
  ) {
    this.userRepository = userRepository;
    this.companyRepository = companyRepository;
    this.companyMemberRepository = companyMemberRepository;
    this.companySettingsRepository = companySettingsRepository;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
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

    return responseWithToken(user, company);
  }

  @Transactional
  public AuthResponse login(LoginRequest request) {
    String email = normalizeEmail(request.email());
    User user = userRepository.findByEmail(email)
        .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

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
    return new AuthResponse(null, UserResponse.from(user), CompanyResponse.from(company));
  }

  private AuthResponse responseWithToken(User user, Company company) {
    return new AuthResponse(
        jwtService.generateToken(user),
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
}
