package com.myvision.api.repository;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

  List<Invoice> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

  List<Invoice> findTop5ByCompanyIdOrderByCreatedAtDesc(UUID companyId);

  Optional<Invoice> findByIdAndCompanyId(UUID id, UUID companyId);

  /**
   * Candidates for the overdue sweep, across all companies. A null dueDate is excluded by
   * the SQL comparison, which is the intended behaviour: an invoice with no due date can
   * never be late.
   */
  List<Invoice> findByStatusInAndDueDateBefore(
      Collection<InvoiceStatus> statuses, LocalDate dueDate);

  @Query("""  
      select coalesce(sum(i.totalAmount), 0) from Invoice i
      where i.companyId = :companyId
        and i.status in :statuses
        and i.issueDate >= :from and i.issueDate <= :to
      """)
  BigDecimal sumInvoicedBetween(
      @Param("companyId") UUID companyId,
      @Param("statuses") Collection<InvoiceStatus> statuses,
      @Param("from") LocalDate from,
      @Param("to") LocalDate to);

  @Query("""
      select coalesce(sum(i.balanceDue), 0) from Invoice i
      where i.companyId = :companyId
        and i.status in :statuses
      """)
  BigDecimal sumOutstanding(
      @Param("companyId") UUID companyId,
      @Param("statuses") Collection<InvoiceStatus> statuses);

  @Query("""
      select coalesce(sum(i.balanceDue), 0) from Invoice i
      where i.companyId = :companyId
        and i.status in :statuses
        and i.dueDate < :today
      """)
  BigDecimal sumOverdue(
      @Param("companyId") UUID companyId,
      @Param("statuses") Collection<InvoiceStatus> statuses,
      @Param("today") LocalDate today);

  @Query("""
      select count(i) from Invoice i
      where i.companyId = :companyId
        and i.status in :statuses
        and i.dueDate < :today
      """)
  long countOverdue(
      @Param("companyId") UUID companyId,
      @Param("statuses") Collection<InvoiceStatus> statuses,
      @Param("today") LocalDate today);

  long countByClientId(java.util.UUID clientId);

  /** Every invoice issued in a window, for the dashboard's monthly series. */
  List<Invoice> findByCompanyIdAndIssueDateBetween(
      UUID companyId, LocalDate from, LocalDate to);

  /**
   * One contact's invoices, newest issue date first, for their detail screen.
   *
   * <p>Ordered by issue date rather than creation: that is the date on the document, and the
   * order an operator reading the billing history expects. Creation time breaks ties so two
   * invoices issued the same day still come back in a stable order.
   */
  List<Invoice> findByCompanyIdAndClientIdOrderByIssueDateDescCreatedAtDesc(
      UUID companyId, UUID clientId);

}
