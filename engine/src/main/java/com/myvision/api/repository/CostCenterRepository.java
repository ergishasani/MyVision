package com.myvision.api.repository;

import com.myvision.api.entity.CostCenter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CostCenterRepository extends JpaRepository<CostCenter, UUID> {

  List<CostCenter> findByCompanyIdAndArchivedAtIsNullOrderByNameAsc(UUID companyId);

  Optional<CostCenter> findByIdAndCompanyId(UUID id, UUID companyId);

  boolean existsByCompanyIdAndNumber(UUID companyId, String number);
}
