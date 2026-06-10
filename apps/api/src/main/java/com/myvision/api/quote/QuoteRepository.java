package com.myvision.api.quote;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteRepository extends JpaRepository<Quote, UUID> {

  List<Quote> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

  Optional<Quote> findByIdAndCompanyId(UUID id, UUID companyId);

  long countByCompanyIdAndStatusIn(UUID companyId, List<QuoteStatus> statuses);
}
