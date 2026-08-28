package com.myvision.api.repository;

import com.myvision.api.entity.Product;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, UUID> {

  List<Product> findByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(UUID companyId);

  Optional<Product> findByIdAndCompanyId(UUID id, UUID companyId);

  boolean existsByCompanyIdAndArticleNumber(UUID companyId, Integer articleNumber);
}
