package com.myvision.api.invoice;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, UUID> {

  List<InvoiceItem> findByInvoiceIdOrderByPositionAsc(UUID invoiceId);

  void deleteByInvoiceId(UUID invoiceId);
}
