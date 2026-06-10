package com.myvision.api.quote;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuoteItemRepository extends JpaRepository<QuoteItem, UUID> {

  List<QuoteItem> findByQuoteIdOrderByPositionAsc(UUID quoteId);

  void deleteByQuoteId(UUID quoteId);
}
