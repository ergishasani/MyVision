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

public interface DeliveryNoteRepository extends JpaRepository<DeliveryNote, UUID> {

  /** Newest delivery first — the order an operator reads a delivery history in. */
  List<DeliveryNote> findByCompanyIdOrderByDeliveryDateDescCreatedAtDesc(UUID companyId);

  Optional<DeliveryNote> findByIdAndCompanyId(UUID id, UUID companyId);

  long countByClientId(UUID clientId);
}
