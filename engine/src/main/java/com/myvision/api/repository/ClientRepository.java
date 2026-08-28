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

public interface ClientRepository extends JpaRepository<Client, UUID> {

  List<Client> findByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(UUID companyId);

  List<Client> findTop5ByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(UUID companyId);

  Optional<Client> findByIdAndCompanyId(UUID id, UUID companyId);

  boolean existsByCompanyIdAndCustomerNumber(UUID companyId, Integer customerNumber);

  Optional<Client> findByIdAndCompanyIdAndArchivedAtIsNull(UUID id, UUID companyId);
}
