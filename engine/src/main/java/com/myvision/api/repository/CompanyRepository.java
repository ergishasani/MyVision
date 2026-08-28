package com.myvision.api.repository;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CompanyRepository extends JpaRepository<Company, UUID> {

  /**
   * Locks the company row while generating the next quote/invoice number so
   * concurrent requests cannot produce duplicate document numbers.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select c from Company c where c.id = :id")
  Optional<Company> findByIdForUpdate(@Param("id") UUID id);
}
