package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.service.AuditLogService;
import com.myvision.api.service.ClientService;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.service.CompanyAccessService;
import com.myvision.api.entity.LineItemKind;
import com.myvision.api.exception.ResourceNotFoundException;
import com.myvision.api.entity.Company;
import com.myvision.api.entity.NumberRangeType;
import com.myvision.api.repository.CompanyRepository;
import com.myvision.api.service.ProjectService;
import com.myvision.api.entity.Quote;
import com.myvision.api.entity.QuoteItem;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InvoiceService {

  private final InvoiceRepository invoiceRepository;
  private final InvoiceItemRepository invoiceItemRepository;
  private final CompanyRepository companyRepository;
  private final ClientService clientService;
  private final ProjectService projectService;
  private final CompanyAccessService companyAccessService;
  private final AuditLogService auditLogService;
  private final NumberRangeService numberRangeService;
  private final PaymentRepository paymentRepository;

  public InvoiceService(
      InvoiceRepository invoiceRepository,
      InvoiceItemRepository invoiceItemRepository,
      CompanyRepository companyRepository,
      ClientService clientService,
      ProjectService projectService,
      CompanyAccessService companyAccessService,
      AuditLogService auditLogService,
      NumberRangeService numberRangeService,
      PaymentRepository paymentRepository
  ) {
    this.invoiceRepository = invoiceRepository;
    this.invoiceItemRepository = invoiceItemRepository;
    this.companyRepository = companyRepository;
    this.clientService = clientService;
    this.projectService = projectService;
    this.companyAccessService = companyAccessService;
    this.auditLogService = auditLogService;
    this.numberRangeService = numberRangeService;
    this.paymentRepository = paymentRepository;
  }

  @Transactional(readOnly = true)
  public List<InvoiceResponse> list(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return invoiceRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
        .stream()
        .map(invoice -> InvoiceResponse.from(
            invoice, invoiceItemRepository.findByInvoiceIdOrderByPositionAsc(invoice.getId())))
        .toList();
  }

  @Transactional(readOnly = true)
  public InvoiceResponse get(UUID userId, UUID invoiceId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return toResponse(requireInvoice(invoiceId, companyId));
  }

  @Transactional
  public InvoiceResponse create(UUID userId, InvoiceRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    // Lock the company row so the invoice number sequence is race-free.
    Company company = companyRepository.findByIdForUpdate(companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Company not found"));

    Client client = clientService.requireActiveClient(request.clientId(), companyId);
    if (request.projectId() != null) {
      projectService.requireProject(request.projectId(), companyId);
    }

    Invoice invoice = new Invoice();
    invoice.setCompanyId(companyId);
    invoice.setClientId(request.clientId());
    invoice.setProjectId(request.projectId());
    invoice.setInvoiceNumber(nextInvoiceNumber(company));
    invoice.setType(request.type() != null ? request.type() : InvoiceType.STANDARD);
    invoice.setStatus(InvoiceStatus.draft);
    if (request.issueDate() != null) {
      invoice.setIssueDate(request.issueDate());
    }
    invoice.setDueDate(request.dueDate() != null
        ? request.dueDate()
        : invoice.getIssueDate().plusDays(company.getPaymentTermsDays()));
    invoice.setCurrency(request.currency() != null
        ? request.currency().toUpperCase()
        : company.getDefaultCurrency());
    invoice.setDiscountAmount(request.discountAmount() != null
        ? request.discountAmount()
        : BigDecimal.ZERO);
    invoice.setNotes(request.notes());
    invoice.setTerms(request.terms());
    invoice = invoiceRepository.save(invoice);

    applyDocumentFields(invoice, request, client);

    List<InvoiceItem> items = saveItems(invoice.getId(), request.items());
    // A supply that is not domestically taxable carries no VAT, whatever the lines say. Zeroing
    // the rates here rather than trusting the caller means a reverse-charge invoice cannot leave
    // this method with 19% on it, which is the kind of error that reaches a tax office.
    if (invoice.getTaxScheme() != InvoiceTaxScheme.domestic_taxable) {
      for (InvoiceItem item : items) {
        item.setTaxRate(BigDecimal.ZERO);
      }
      items = invoiceItemRepository.saveAll(items);
    }
    applyTotals(invoice, items);
    invoice = invoiceRepository.save(invoice);
    auditLogService.record(
        companyId, userId, "invoice", invoice.getId(), "created",
        "{\"invoiceNumber\":\"%s\"}".formatted(invoice.getInvoiceNumber()));

    return InvoiceResponse.from(invoice, items);
  }

  /** Creates an invoice from an accepted quote. Called by the quote domain. */
  @Transactional
  public InvoiceResponse createFromQuote(Quote quote, List<QuoteItem> quoteItems, UUID actorUserId) {
    Company company = companyRepository.findByIdForUpdate(quote.getCompanyId())
        .orElseThrow(() -> new ResourceNotFoundException("Company not found"));

    Invoice invoice = new Invoice();
    invoice.setCompanyId(quote.getCompanyId());
    invoice.setClientId(quote.getClientId());
    invoice.setProjectId(quote.getProjectId());
    invoice.setSourceQuoteId(quote.getId());
    invoice.setInvoiceNumber(nextInvoiceNumber(company));
    invoice.setType(InvoiceType.STANDARD);
    invoice.setStatus(InvoiceStatus.draft);
    invoice.setIssueDate(LocalDate.now());
    invoice.setDueDate(LocalDate.now().plusDays(company.getPaymentTermsDays()));
    invoice.setCurrency(quote.getCurrency());
    invoice.setDiscountAmount(quote.getDiscountAmount());
    invoice.setNotes(quote.getNotes());
    invoice.setTerms(quote.getTerms());
    invoice = invoiceRepository.save(invoice);

    List<InvoiceItem> items = new ArrayList<>();
    for (QuoteItem quoteItem : quoteItems) {
      InvoiceItem item = new InvoiceItem();
      item.setInvoiceId(invoice.getId());
      item.setPosition(quoteItem.getPosition());
      item.setKind(quoteItem.getKind());
      item.setDescription(quoteItem.getDescription());
      item.setQuantity(quoteItem.getQuantity());
      item.setUnit(quoteItem.getUnit());
      item.setUnitPrice(quoteItem.getUnitPrice());
      item.setTaxRate(quoteItem.getTaxRate());
      item.setDiscountAmount(quoteItem.getDiscountAmount());
      item.setLineTotal(quoteItem.getLineTotal());
      items.add(item);
    }
    items = invoiceItemRepository.saveAll(items);

    applyTotals(invoice, items);
    invoice = invoiceRepository.save(invoice);
    auditLogService.record(
        quote.getCompanyId(), actorUserId, "invoice", invoice.getId(), "created_from_quote",
        "{\"quoteId\":\"%s\",\"invoiceNumber\":\"%s\"}"
            .formatted(quote.getId(), invoice.getInvoiceNumber()));
    return InvoiceResponse.from(invoice, items);
  }

  @Transactional
  public InvoiceResponse update(UUID userId, UUID invoiceId, InvoiceUpdateRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = requireInvoice(invoiceId, companyId);

    if (invoice.getStatus() != InvoiceStatus.draft) {
      throw new BadRequestException("Only draft invoices can be updated");
    }

    if (request.clientId() != null) {
      clientService.requireActiveClient(request.clientId(), companyId);
      invoice.setClientId(request.clientId());
    }
    if (request.projectId() != null) {
      projectService.requireProject(request.projectId(), companyId);
      invoice.setProjectId(request.projectId());
    }
    if (request.type() != null) {
      invoice.setType(request.type());
    }
    if (request.issueDate() != null) {
      invoice.setIssueDate(request.issueDate());
    }
    if (request.dueDate() != null) {
      invoice.setDueDate(request.dueDate());
    }
    if (request.currency() != null) {
      invoice.setCurrency(request.currency().toUpperCase());
    }
    if (request.discountAmount() != null) {
      invoice.setDiscountAmount(request.discountAmount());
    }
    if (request.notes() != null) {
      invoice.setNotes(request.notes());
    }
    if (request.terms() != null) {
      invoice.setTerms(request.terms());
    }

    List<InvoiceItem> items;
    if (request.items() != null) {
      if (request.items().isEmpty()) {
        throw new BadRequestException("An invoice must have at least one item");
      }
      invoiceItemRepository.deleteByInvoiceId(invoice.getId());
      invoiceItemRepository.flush();
      items = saveItems(invoice.getId(), request.items());
    } else {
      items = invoiceItemRepository.findByInvoiceIdOrderByPositionAsc(invoice.getId());
    }

    applyTotals(invoice, items);
    invoice = invoiceRepository.save(invoice);
    auditLogService.record(companyId, userId, "invoice", invoice.getId(), "updated", "{}");
    return InvoiceResponse.from(invoice, items);
  }

  @Transactional
  public InvoiceResponse markSent(UUID userId, UUID invoiceId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = requireInvoice(invoiceId, companyId);
    if (invoice.getStatus() != InvoiceStatus.draft) {
      throw new BadRequestException("Only draft invoices can be marked as sent");
    }
    invoice.setStatus(InvoiceStatus.sent);
    invoice.setSentAt(OffsetDateTime.now());
    auditLogService.record(companyId, userId, "invoice", invoice.getId(), "marked_sent", "{}");
    return toResponse(invoiceRepository.save(invoice));
  }

  @Transactional
  public InvoiceResponse markPaid(UUID userId, UUID invoiceId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = requireInvoice(invoiceId, companyId);
    if (invoice.getStatus() == InvoiceStatus.cancelled) {
      throw new BadRequestException("A cancelled invoice cannot be marked as paid");
    }
    if (invoice.getStatus() == InvoiceStatus.paid) {
      throw new BadRequestException("Invoice is already paid");
    }
    // Settle the outstanding balance as a real payment rather than only moving the invoice's
    // own numbers. Without a row here the payments ledger silently misses money that arrived:
    // /payments, the dashboard's collected figure and the invoice's own status would each tell a
    // different story about the same settlement. Only the remainder is recorded, so an invoice
    // that already had part-payments against it does not end up over-paid in the ledger.
    OffsetDateTime settledAt = OffsetDateTime.now();
    BigDecimal outstanding = invoice.getBalanceDue() == null
        ? invoice.getTotalAmount()
        : invoice.getBalanceDue();
    if (outstanding.compareTo(BigDecimal.ZERO) > 0) {
      Payment settlement = new Payment();
      settlement.setCompanyId(companyId);
      settlement.setInvoiceId(invoice.getId());
      settlement.setAmount(outstanding);
      settlement.setCurrency(invoice.getCurrency());
      // The method is genuinely unknown — "marked as paid" says money arrived, not how.
      settlement.setMethod(PaymentMethod.other);
      settlement.setPaidAt(settledAt);
      settlement.setNotes("Recorded automatically when the invoice was marked as paid");
      paymentRepository.save(settlement);
    }

    invoice.setAmountPaid(invoice.getTotalAmount());
    invoice.setBalanceDue(BigDecimal.ZERO.setScale(2));
    invoice.setStatus(InvoiceStatus.paid);
    invoice.setPaidAt(settledAt);
    auditLogService.record(companyId, userId, "invoice", invoice.getId(), "marked_paid", "{}");
    return toResponse(invoiceRepository.save(invoice));
  }

  @Transactional
  public InvoiceResponse cancel(UUID userId, UUID invoiceId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = requireInvoice(invoiceId, companyId);
    if (invoice.getStatus() == InvoiceStatus.paid) {
      throw new BadRequestException("A paid invoice cannot be cancelled");
    }
    if (invoice.getStatus() == InvoiceStatus.cancelled) {
      throw new BadRequestException("Invoice is already cancelled");
    }
    invoice.setStatus(InvoiceStatus.cancelled);
    invoice.setCancelledAt(OffsetDateTime.now());
    auditLogService.record(companyId, userId, "invoice", invoice.getId(), "cancelled", "{}");
    return toResponse(invoiceRepository.save(invoice));
  }

  /** Tenant-safe lookup used by the payment domain as well. */
  @Transactional(readOnly = true)
  public Invoice requireInvoice(UUID invoiceId, UUID companyId) {
    return invoiceRepository.findByIdAndCompanyId(invoiceId, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
  }

  private InvoiceResponse toResponse(Invoice invoice) {
    return InvoiceResponse.from(
        invoice, invoiceItemRepository.findByInvoiceIdOrderByPositionAsc(invoice.getId()));
  }

  /**
   * Allocates the next invoice number.
   *
   * <p>Delegates to the shared counter so the format configured under accounting settings is the
   * one that reaches the document, and so the row lock there covers concurrent creation.
   */
  private String nextInvoiceNumber(Company company) {
    return numberRangeService.allocate(company.getId(), NumberRangeType.invoice);
  }

  private List<InvoiceItem> saveItems(UUID invoiceId, List<InvoiceItemRequest> requests) {
    List<InvoiceItem> items = new ArrayList<>();
    int position = 1;
    for (InvoiceItemRequest itemRequest : requests) {
      InvoiceItem item = new InvoiceItem();
      item.setInvoiceId(invoiceId);
      item.setPosition(position++);
      item.setKind(itemRequest.kind() != null ? itemRequest.kind() : LineItemKind.service);
      item.setDescription(itemRequest.description().trim());
      item.setQuantity(itemRequest.quantity());
      item.setUnit(itemRequest.unit() != null ? itemRequest.unit() : "pcs");
      item.setUnitPrice(itemRequest.unitPrice());
      item.setTaxRate(itemRequest.taxRate() != null
          ? itemRequest.taxRate()
          : BigDecimal.valueOf(19));
      item.setDiscountAmount(itemRequest.discountAmount() != null
          ? itemRequest.discountAmount()
          : BigDecimal.ZERO);
      item.setLineTotal(lineTotal(item));
      items.add(item);
    }
    return invoiceItemRepository.saveAll(items);
  }

  private BigDecimal lineTotal(InvoiceItem item) {
    return item.getQuantity()
        .multiply(item.getUnitPrice())
        .subtract(item.getDiscountAmount())
        .setScale(2, RoundingMode.HALF_UP);
  }

  private void applyTotals(Invoice invoice, List<InvoiceItem> items) {
    BigDecimal subtotal = BigDecimal.ZERO;
    for (InvoiceItem item : items) {
      subtotal = subtotal.add(item.getLineTotal());
    }
    BigDecimal discount = invoice.getDiscountAmount() != null
        ? invoice.getDiscountAmount()
        : BigDecimal.ZERO;
    if (discount.compareTo(subtotal) > 0) {
      throw new BadRequestException("Discount amount cannot exceed subtotal");
    }

    BigDecimal tax = taxAfterDocumentDiscount(items, subtotal, discount);
    BigDecimal total = subtotal.subtract(discount).add(tax).setScale(2, RoundingMode.HALF_UP);

    invoice.setSubtotalAmount(subtotal.setScale(2, RoundingMode.HALF_UP));
    invoice.setTaxAmount(tax.setScale(2, RoundingMode.HALF_UP));
    invoice.setTotalAmount(total);
    invoice.setBalanceDue(total.subtract(invoice.getAmountPaid()));
  }

  private BigDecimal taxAfterDocumentDiscount(
      List<InvoiceItem> items,
      BigDecimal subtotal,
      BigDecimal discount
  ) {
    if (subtotal.compareTo(BigDecimal.ZERO) == 0) {
      return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    BigDecimal tax = BigDecimal.ZERO;
    BigDecimal remainingDiscount = discount;
    for (int i = 0; i < items.size(); i++) {
      InvoiceItem item = items.get(i);
      BigDecimal lineDiscount = i == items.size() - 1
          ? remainingDiscount
          : discount
              .multiply(item.getLineTotal())
              .divide(subtotal, 2, RoundingMode.HALF_UP);
      remainingDiscount = remainingDiscount.subtract(lineDiscount);

      BigDecimal taxableLine = item.getLineTotal().subtract(lineDiscount);
      tax = tax.add(taxableLine
          .multiply(item.getTaxRate())
          .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP));
    }
    return tax.setScale(2, RoundingMode.HALF_UP);
  }

  /**
   * The fields that make the document a document rather than a row of totals.
   *
   * <p>Two defaults are worth naming. The delivery date falls back to the issue date, because
   * Sec. 14 UStG wants one and an invoice raised for work done today is the overwhelmingly common
   * case — an operator who needs a different one sets it. Skonto falls back to the contact's own
   * agreed terms, so the discount a customer was promised does not have to be retyped per invoice.
   *
   * <p>The recipient block is copied, not referenced. The invoice must keep the name and address
   * it was issued to even if the contact later moves.
   */
  private void applyDocumentFields(Invoice invoice, InvoiceRequest request, Client client) {
    invoice.setDeliveryDate(
        request.deliveryDate() != null ? request.deliveryDate() : invoice.getIssueDate());
    invoice.setServicePeriodStart(request.servicePeriodStart());
    invoice.setServicePeriodEnd(request.servicePeriodEnd());
    invoice.setSubject(request.subject());
    invoice.setReference(request.reference());

    invoice.setTaxScheme(request.taxScheme() != null
        ? request.taxScheme()
        : InvoiceTaxScheme.domestic_taxable);
    invoice.setPaymentMethod(request.paymentMethod() != null
        ? request.paymentMethod()
        : PaymentMethod.bank_transfer);
    invoice.setLanguage(request.language() != null
        ? request.language().toLowerCase()
        : "de");
    invoice.setCostCenterId(request.costCenterId());
    invoice.setContactPersonUserId(request.contactPersonUserId());

    invoice.setSkontoDays(request.skontoDays() != null
        ? request.skontoDays()
        : client.getDiscountDays());
    invoice.setSkontoPercent(request.skontoPercent() != null
        ? request.skontoPercent()
        : client.getDiscountPercent());

    boolean eInvoice = Boolean.TRUE.equals(request.eInvoice());
    invoice.setEInvoice(eInvoice);
    // Absent means the company name, which is what every invoice raised before this option
    // existed carried.
    invoice.setShowCompanyName(!Boolean.FALSE.equals(request.showCompanyName()));
    String email = request.recipientEmail() != null ? request.recipientEmail() : client.getEmail();
    invoice.setRecipientEmail(email);
    // XRechnung has nowhere to put a document without a recipient address to send it to, so the
    // requirement is refused up front rather than failing later at export time.
    if (eInvoice && (email == null || email.isBlank())) {
      throw new BadRequestException(
          "An e-invoice needs a recipient email address. Add one to the contact, or enter it on "
              + "the invoice.");
    }

    invoice.setRecipientName(firstNonBlank(request.recipientName(), client.getName()));
    invoice.setRecipientAddressLine1(
        firstNonBlank(request.recipientAddressLine1(), client.getAddressLine1()));
    invoice.setRecipientAddressLine2(
        firstNonBlank(request.recipientAddressLine2(), client.getAddressLine2()));
    invoice.setRecipientPostalCode(
        firstNonBlank(request.recipientPostalCode(), client.getPostalCode()));
    invoice.setRecipientCity(firstNonBlank(request.recipientCity(), client.getCity()));
    String country = firstNonBlank(request.recipientCountryCode(), client.getCountryCode());
    invoice.setRecipientCountryCode(country != null ? country.toUpperCase() : null);
  }

  private static String firstNonBlank(String preferred, String fallback) {
    if (preferred != null && !preferred.isBlank()) {
      return preferred;
    }
    return fallback == null || fallback.isBlank() ? null : fallback;
  }

  /**
   * Replaces an invoice's tags.
   *
   * <p>Allowed at any status, unlike every other edit. Tags describe how the operator files the
   * invoice, not what it says, so freezing them when the document freezes would make them useless
   * — the point at which you want to label something is usually after it has gone out.
   *
   * <p>Trimmed, de-duplicated case-insensitively and emptied of blanks, so "Roof", "roof " and ""
   * cannot all end up on the same invoice.
   */
  @Transactional
  public InvoiceResponse replaceTags(UUID userId, UUID invoiceId, List<String> tags) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Invoice invoice = requireInvoice(invoiceId, companyId);

    java.util.LinkedHashMap<String, String> unique = new java.util.LinkedHashMap<>();
    if (tags != null) {
      for (String tag : tags) {
        if (tag == null) {
          continue;
        }
        String trimmed = tag.trim();
        if (!trimmed.isEmpty()) {
          unique.putIfAbsent(trimmed.toLowerCase(java.util.Locale.ROOT), trimmed);
        }
      }
    }

    invoice.setTags(unique.values().toArray(new String[0]));
    return toResponse(invoiceRepository.save(invoice));
  }
}
