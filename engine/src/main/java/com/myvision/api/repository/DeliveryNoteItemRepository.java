package com.myvision.api.repository;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryNoteItemRepository extends JpaRepository<DeliveryNoteItem, UUID> {

  List<DeliveryNoteItem> findByDeliveryNoteIdOrderByPositionAsc(UUID deliveryNoteId);

  List<DeliveryNoteItem> findByDeliveryNoteIdIn(Collection<UUID> deliveryNoteIds);

  void deleteByDeliveryNoteId(UUID deliveryNoteId);
}
