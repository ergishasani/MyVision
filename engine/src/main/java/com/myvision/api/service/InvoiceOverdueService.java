package com.myvision.api.service;

import com.myvision.api.entity.Invoice;
import com.myvision.api.entity.InvoiceStatus;
import com.myvision.api.repository.InvoiceRepository;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Moves invoices past their due date into {@link InvoiceStatus#overdue}.
 *
 * <p>The dashboard already derives its overdue totals from {@code dueDate} directly, so the
 * figures were never wrong. What was missing is the invoice's own status: without this sweep an
 * invoice sixty days late still reads {@code sent} everywhere it is listed, and the
 * {@code overdue} enum value was unreachable.
 *
 * <p>Runs across all companies, so it deliberately bypasses the tenant-scoped lookups used by the
 * request path. There is no acting user, so audit entries have a null actor.
 */
@Service
public class InvoiceOverdueService {

  private static final Logger log = LoggerFactory.getLogger(InvoiceOverdueService.class);

  /**
   * Statuses that can go overdue. Deliberately excludes draft (never issued), paid (settled), and
   * cancelled (withdrawn) — none of those are late no matter what the due date says.
   */
  private static final List<InvoiceStatus> SWEEPABLE_STATUSES = List.of(
      InvoiceStatus.sent, InvoiceStatus.unpaid, InvoiceStatus.partially_paid);

  private final InvoiceRepository invoiceRepository;
  private final AuditLogService auditLogService;

  public InvoiceOverdueService(
      InvoiceRepository invoiceRepository,
      AuditLogService auditLogService
  ) {
    this.invoiceRepository = invoiceRepository;
    this.auditLogService = auditLogService;
  }

  @Scheduled(cron = "${invoices.overdue-sweep.cron:0 10 2 * * *}")
  public void sweepDaily() {
    int marked = markOverdue(LocalDate.now());
    if (marked > 0) {
      log.info("Overdue sweep marked {} invoice(s) overdue", marked);
    }
  }

  /**
   * Marks every sweepable invoice due before {@code today} as overdue and returns how many changed.
   *
   * <p>Rows are loaded and saved individually rather than updated with one bulk statement so each
   * transition gets an audit entry. On an invoicing product the history of how a status changed is
   * worth more than the round trips it costs, and the candidate set is small: it only ever contains
   * invoices that are late and not yet marked.
   *
   * <p>Idempotent. Running it twice in a day is a no-op the second time, because an invoice already
   * in {@code overdue} is no longer a candidate.
   */
  @Transactional
  public int markOverdue(LocalDate today) {
    List<Invoice> candidates =
        invoiceRepository.findByStatusInAndDueDateBefore(SWEEPABLE_STATUSES, today);
    if (candidates.isEmpty()) {
      return 0;
    }

    for (Invoice invoice : candidates) {
      InvoiceStatus previous = invoice.getStatus();
      invoice.setStatus(InvoiceStatus.overdue);
      auditLogService.record(
          invoice.getCompanyId(),
          null,
          "invoice",
          invoice.getId(),
          "marked_overdue",
          "{\"previousStatus\":\"%s\",\"dueDate\":\"%s\"}"
              .formatted(previous, invoice.getDueDate())
      );
    }
    invoiceRepository.saveAll(candidates);
    return candidates.size();
  }
}
