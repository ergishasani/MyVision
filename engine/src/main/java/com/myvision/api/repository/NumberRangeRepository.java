package com.myvision.api.repository;

import com.myvision.api.entity.NumberRange;
import com.myvision.api.entity.NumberRangeType;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NumberRangeRepository extends JpaRepository<NumberRange, UUID> {

  List<NumberRange> findByCompanyId(UUID companyId);

  Optional<NumberRange> findByCompanyIdAndType(UUID companyId, NumberRangeType type);

  /**
   * Takes a row lock before reading the counter.
   *
   * <p>Without it two documents created at the same instant both read the same "next number" and
   * one of them ends up rejected by the unique index — or worse, in a table without one.
   */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select r from NumberRange r where r.companyId = :companyId and r.type = :type")
  Optional<NumberRange> findByCompanyIdAndTypeForUpdate(
      @Param("companyId") UUID companyId, @Param("type") NumberRangeType type);
}
