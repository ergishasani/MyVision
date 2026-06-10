package com.myvision.api.client;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientRepository extends JpaRepository<Client, UUID> {

  List<Client> findByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(UUID companyId);

  List<Client> findTop5ByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(UUID companyId);

  Optional<Client> findByIdAndCompanyId(UUID id, UUID companyId);

  Optional<Client> findByIdAndCompanyIdAndArchivedAtIsNull(UUID id, UUID companyId);
}
