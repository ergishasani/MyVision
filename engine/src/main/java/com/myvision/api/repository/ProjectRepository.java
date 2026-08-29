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

public interface ProjectRepository extends JpaRepository<Project, UUID> {

  List<Project> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

  Optional<Project> findByIdAndCompanyId(UUID id, UUID companyId);

  long countByCompanyIdAndStatus(UUID companyId, ProjectStatus status);

  long countByClientId(java.util.UUID clientId);

  /** One contact's projects, newest first, for their detail screen. */
  List<Project> findByCompanyIdAndClientIdOrderByCreatedAtDesc(UUID companyId, UUID clientId);

}
