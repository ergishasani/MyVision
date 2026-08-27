package com.myvision.api.repository;

import com.myvision.api.entity.Refund;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RefundRepository extends JpaRepository<Refund, UUID> {

  List<Refund> findByInvoiceIdAndCompanyIdOrderByCreatedAtDesc(UUID invoiceId, UUID companyId);

  boolean existsByStripeRefundId(String stripeRefundId);

  /**
   * Total already refunded against one payment.
   *
   * <p>Stripe reports {@code amount_refunded} on a charge cumulatively, so reconciling a
   * dashboard-issued refund means subtracting what is already recorded to find the new delta.
   */
  @Query("""
      select coalesce(sum(r.amount), 0) from Refund r
      where r.paymentId = :paymentId
      """)
  BigDecimal sumRefundedForPayment(@Param("paymentId") UUID paymentId);
}
