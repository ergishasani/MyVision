package com.myvision.api.repository;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {

  List<Payment> findByInvoiceIdAndCompanyIdOrderByPaidAtDesc(UUID invoiceId, UUID companyId);

  boolean existsByStripePaymentIntentId(String stripePaymentIntentId);

  Optional<Payment> findByStripePaymentIntentId(String stripePaymentIntentId);

  List<Payment> findByCompanyIdOrderByPaidAtDesc(UUID companyId);

  /** Payments received in a window, for the dashboard's monthly series. */
  List<Payment> findByCompanyIdAndPaidAtBetween(
      UUID companyId, OffsetDateTime from, OffsetDateTime to);

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
