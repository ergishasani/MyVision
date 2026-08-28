package com.myvision.api.repository;

import com.myvision.api.entity.ProductUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductUnitRepository extends JpaRepository<ProductUnit, UUID> {

  List<ProductUnit> findByProductIdOrderByPositionAsc(UUID productId);

  void deleteByProductId(UUID productId);
}
