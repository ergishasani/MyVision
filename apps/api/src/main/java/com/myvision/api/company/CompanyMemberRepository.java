package com.myvision.api.company;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyMemberRepository extends JpaRepository<CompanyMember, UUID> {

  Optional<CompanyMember> findFirstByUser_IdOrderByCreatedAtAsc(UUID userId);
}
