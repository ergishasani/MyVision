package com.myvision.api.repository;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteItemRepository extends JpaRepository<QuoteItem, UUID> {

  List<QuoteItem> findByQuoteIdOrderByPositionAsc(UUID quoteId);

  void deleteByQuoteId(UUID quoteId);
}
