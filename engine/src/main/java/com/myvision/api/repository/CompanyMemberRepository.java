package com.myvision.api.repository;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyMemberRepository extends JpaRepository<CompanyMember, UUID> {

  Optional<CompanyMember> findFirstByUser_IdOrderByCreatedAtAsc(UUID userId);

  java.util.List<CompanyMember> findByCompany_IdOrderByCreatedAtAsc(UUID companyId);

  Optional<CompanyMember> findByIdAndCompany_Id(UUID id, UUID companyId);

  long countByCompany_IdAndRole(UUID companyId, CompanyMemberRole role);

  Optional<CompanyMember> findFirstByCompany_IdAndRoleOrderByCreatedAtAsc(
      UUID companyId, CompanyMemberRole role);
}
