package com.myvision.api.payment;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

  List<Payment> findByInvoiceIdAndCompanyIdOrderByPaidAtDesc(UUID invoiceId, UUID companyId);

  @Query("""
      select coalesce(sum(p.amount), 0) from Payment p
      where p.companyId = :companyId
        and p.paidAt >= :from and p.paidAt < :to
      """)
  BigDecimal sumPaidBetween(
      @Param("companyId") UUID companyId,
      @Param("from") OffsetDateTime from,
      @Param("to") OffsetDateTime to);
}
