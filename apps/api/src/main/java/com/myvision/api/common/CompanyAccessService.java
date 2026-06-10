package com.myvision.api.common;

import com.myvision.api.company.Company;
import com.myvision.api.company.CompanyMember;
import com.myvision.api.company.CompanyMemberRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves the company the authenticated user belongs to. Every tenant-scoped
 * query must be filtered by the company id returned here.
 */
@Service
public class CompanyAccessService {

  private final CompanyMemberRepository companyMemberRepository;

  public CompanyAccessService(CompanyMemberRepository companyMemberRepository) {
    this.companyMemberRepository = companyMemberRepository;
  }

  @Transactional(readOnly = true)
  public Company currentCompany(UUID userId) {
    return companyMemberRepository.findFirstByUser_IdOrderByCreatedAtAsc(userId)
        .map(CompanyMember::getCompany)
        .orElseThrow(() -> new ForbiddenException("User does not belong to any company"));
  }

  @Transactional(readOnly = true)
  public UUID currentCompanyId(UUID userId) {
    return currentCompany(userId).getId();
  }
}
