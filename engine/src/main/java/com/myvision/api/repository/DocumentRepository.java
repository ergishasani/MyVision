package com.myvision.api.repository;

import com.myvision.api.entity.Document;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

  List<Document> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

  List<Document> findByInvoiceIdAndCompanyIdOrderByCreatedAtDesc(UUID invoiceId, UUID companyId);

  /**
   * Used to keep regeneration idempotent: storing the same invoice PDF twice updates one row
   * rather than accumulating a row per click.
   */
  Optional<Document> findByCompanyIdAndInvoiceIdAndFileName(
      UUID companyId, UUID invoiceId, String fileName);
}
