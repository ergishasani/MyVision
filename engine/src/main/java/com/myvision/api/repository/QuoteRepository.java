package com.myvision.api.repository;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteRepository extends JpaRepository<Quote, UUID> {

  List<Quote> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

  Optional<Quote> findByIdAndCompanyId(UUID id, UUID companyId);

  long countByCompanyIdAndStatusIn(UUID companyId, List<QuoteStatus> statuses);

  long countByClientId(java.util.UUID clientId);

  /** One contact's quotes, newest issue date first, for their detail screen. */
  List<Quote> findByCompanyIdAndClientIdOrderByIssueDateDescCreatedAtDesc(
      UUID companyId, UUID clientId);

}
