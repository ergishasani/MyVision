package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.service.ClientService;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.service.CompanyAccessService;
import com.myvision.api.entity.LineItemKind;
import com.myvision.api.exception.ResourceNotFoundException;
import com.myvision.api.entity.Company;
import com.myvision.api.entity.NumberRangeType;
import com.myvision.api.repository.CompanyRepository;
import com.myvision.api.dto.InvoiceResponse;
import com.myvision.api.service.InvoiceService;
import com.myvision.api.service.ProjectService;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QuoteService {

  private final QuoteRepository quoteRepository;
  private final QuoteItemRepository quoteItemRepository;
  private final CompanyRepository companyRepository;
  private final ClientService clientService;
  private final ProjectService projectService;
  private final InvoiceService invoiceService;
  private final CompanyAccessService companyAccessService;
  private final NumberRangeService numberRangeService;
  private final AuditLogService auditLogService;

  public QuoteService(
      QuoteRepository quoteRepository,
      QuoteItemRepository quoteItemRepository,
      CompanyRepository companyRepository,
      ClientService clientService,
      ProjectService projectService,
      InvoiceService invoiceService,
      CompanyAccessService companyAccessService,
      NumberRangeService numberRangeService,
      AuditLogService auditLogService
  ) {
    this.quoteRepository = quoteRepository;
    this.quoteItemRepository = quoteItemRepository;
    this.companyRepository = companyRepository;
    this.clientService = clientService;
    this.projectService = projectService;
    this.invoiceService = invoiceService;
    this.companyAccessService = companyAccessService;
    this.numberRangeService = numberRangeService;
    this.auditLogService = auditLogService;
  }

  @Transactional(readOnly = true)
  public List<QuoteResponse> list(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return quoteRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
        .stream()
        .map(quote -> QuoteResponse.from(
            quote, quoteItemRepository.findByQuoteIdOrderByPositionAsc(quote.getId())))
        .toList();
  }

  @Transactional(readOnly = true)
  public QuoteResponse get(UUID userId, UUID quoteId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Quote quote = requireQuote(quoteId, companyId);
    return toResponse(quote);
  }

  @Transactional
  public QuoteResponse create(UUID userId, QuoteRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    // Lock the company row so the quote number sequence is race-free.
    Company company = companyRepository.findByIdForUpdate(companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Company not found"));

    clientService.requireActiveClient(request.clientId(), companyId);
    if (request.projectId() != null) {
      projectService.requireProject(request.projectId(), companyId);
    }

    Quote quote = new Quote();
    quote.setCompanyId(companyId);
    quote.setClientId(request.clientId());
    quote.setProjectId(request.projectId());
    quote.setQuoteNumber(nextQuoteNumber(company));
    quote.setStatus(QuoteStatus.draft);
    if (request.issueDate() != null) {
      quote.setIssueDate(request.issueDate());
    }
    quote.setValidUntil(request.validUntil());
    quote.setCurrency(request.currency() != null
        ? request.currency().toUpperCase()
        : company.getDefaultCurrency());
    quote.setDiscountAmount(request.discountAmount() != null
        ? request.discountAmount()
        : BigDecimal.ZERO);
    quote.setNotes(request.notes());
    quote.setTerms(request.terms());
    quote = quoteRepository.save(quote);

    List<QuoteItem> items = saveItems(quote.getId(), request.items());
    applyTotals(quote, items);
    quote = quoteRepository.save(quote);
    auditLogService.record(
        companyId, userId, "quote", quote.getId(), "created",
        "{\"quoteNumber\":\"%s\"}".formatted(quote.getQuoteNumber()));

    return QuoteResponse.from(quote, items);
  }

  @Transactional
  public QuoteResponse update(UUID userId, UUID quoteId, QuoteUpdateRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Quote quote = requireQuote(quoteId, companyId);

    if (quote.getStatus() != QuoteStatus.draft) {
      throw new BadRequestException("Only draft quotes can be updated");
    }

    if (request.clientId() != null) {
      clientService.requireActiveClient(request.clientId(), companyId);
      quote.setClientId(request.clientId());
    }
    if (request.projectId() != null) {
      projectService.requireProject(request.projectId(), companyId);
      quote.setProjectId(request.projectId());
    }
    if (request.issueDate() != null) {
      quote.setIssueDate(request.issueDate());
    }
    if (request.validUntil() != null) {
      quote.setValidUntil(request.validUntil());
    }
    if (request.currency() != null) {
      quote.setCurrency(request.currency().toUpperCase());
    }
    if (request.discountAmount() != null) {
      quote.setDiscountAmount(request.discountAmount());
    }
    if (request.notes() != null) {
      quote.setNotes(request.notes());
    }
    if (request.terms() != null) {
      quote.setTerms(request.terms());
    }

    List<QuoteItem> items;
    if (request.items() != null) {
      if (request.items().isEmpty()) {
        throw new BadRequestException("A quote must have at least one item");
      }
      quoteItemRepository.deleteByQuoteId(quote.getId());
      quoteItemRepository.flush();
      items = saveItems(quote.getId(), request.items());
    } else {
      items = quoteItemRepository.findByQuoteIdOrderByPositionAsc(quote.getId());
    }

    applyTotals(quote, items);
    quote = quoteRepository.save(quote);
    return QuoteResponse.from(quote, items);
  }

  @Transactional
  public QuoteResponse send(UUID userId, UUID quoteId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Quote quote = requireQuote(quoteId, companyId);
    if (quote.getStatus() != QuoteStatus.draft) {
      throw new BadRequestException("Only draft quotes can be sent");
    }
    quote.setStatus(QuoteStatus.sent);
    quote.setSentAt(OffsetDateTime.now());
    auditLogService.record(
        companyId, userId, "quote", quote.getId(), "sent",
        "{\"quoteNumber\":\"%s\"}".formatted(quote.getQuoteNumber()));
    return toResponse(quoteRepository.save(quote));
  }

  @Transactional
  public QuoteResponse accept(UUID userId, UUID quoteId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Quote quote = requireQuote(quoteId, companyId);
    if (quote.getStatus() != QuoteStatus.sent) {
      throw new BadRequestException("Only sent quotes can be accepted");
    }
    quote.setStatus(QuoteStatus.accepted);
    quote.setAcceptedAt(OffsetDateTime.now());
    auditLogService.record(
        companyId, userId, "quote", quote.getId(), "accepted",
        "{\"quoteNumber\":\"%s\"}".formatted(quote.getQuoteNumber()));
    return toResponse(quoteRepository.save(quote));
  }

  @Transactional
  public QuoteResponse reject(UUID userId, UUID quoteId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Quote quote = requireQuote(quoteId, companyId);
    if (quote.getStatus() != QuoteStatus.sent) {
      throw new BadRequestException("Only sent quotes can be rejected");
    }
    quote.setStatus(QuoteStatus.rejected);
    quote.setRejectedAt(OffsetDateTime.now());
    auditLogService.record(
        companyId, userId, "quote", quote.getId(), "rejected",
        "{\"quoteNumber\":\"%s\"}".formatted(quote.getQuoteNumber()));
    return toResponse(quoteRepository.save(quote));
  }

  @Transactional
  public InvoiceResponse convertToInvoice(UUID userId, UUID quoteId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Quote quote = requireQuote(quoteId, companyId);
    if (quote.getStatus() != QuoteStatus.accepted) {
      throw new BadRequestException("Only accepted quotes can be converted to an invoice");
    }

    List<QuoteItem> items = quoteItemRepository.findByQuoteIdOrderByPositionAsc(quote.getId());
    InvoiceResponse invoice = invoiceService.createFromQuote(quote, items, userId);

    quote.setStatus(QuoteStatus.converted);
    quoteRepository.save(quote);
    return invoice;
  }

  private Quote requireQuote(UUID quoteId, UUID companyId) {
    return quoteRepository.findByIdAndCompanyId(quoteId, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Quote not found"));
  }

  private QuoteResponse toResponse(Quote quote) {
    return QuoteResponse.from(
        quote, quoteItemRepository.findByQuoteIdOrderByPositionAsc(quote.getId()));
  }

  /**
   * Allocates the next quote number.
   *
   * <p>Delegates to the shared counter so the format configured under accounting settings is the
   * one that reaches the document, and so the row lock there covers concurrent creation.
   */
  private String nextQuoteNumber(Company company) {
    return numberRangeService.allocate(company.getId(), NumberRangeType.quote);
  }

  private List<QuoteItem> saveItems(UUID quoteId, List<QuoteItemRequest> requests) {
    List<QuoteItem> items = new ArrayList<>();
    int position = 1;
    for (QuoteItemRequest itemRequest : requests) {
      QuoteItem item = new QuoteItem();
      item.setQuoteId(quoteId);
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
    return quoteItemRepository.saveAll(items);
  }

  private BigDecimal lineTotal(QuoteItem item) {
    return item.getQuantity()
        .multiply(item.getUnitPrice())
        .subtract(item.getDiscountAmount())
        .setScale(2, RoundingMode.HALF_UP);
  }

  private void applyTotals(Quote quote, List<QuoteItem> items) {
    BigDecimal subtotal = BigDecimal.ZERO;
    for (QuoteItem item : items) {
      subtotal = subtotal.add(item.getLineTotal());
    }
    BigDecimal discount = quote.getDiscountAmount() != null
        ? quote.getDiscountAmount()
        : BigDecimal.ZERO;
    if (discount.compareTo(subtotal) > 0) {
      throw new BadRequestException("Discount amount cannot exceed subtotal");
    }

    BigDecimal tax = taxAfterDocumentDiscount(items, subtotal, discount);

    quote.setSubtotalAmount(subtotal.setScale(2, RoundingMode.HALF_UP));
    quote.setTaxAmount(tax.setScale(2, RoundingMode.HALF_UP));
    quote.setTotalAmount(subtotal.subtract(discount).add(tax).setScale(2, RoundingMode.HALF_UP));
  }

  private BigDecimal taxAfterDocumentDiscount(
      List<QuoteItem> items,
      BigDecimal subtotal,
      BigDecimal discount
  ) {
    if (subtotal.compareTo(BigDecimal.ZERO) == 0) {
      return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    BigDecimal tax = BigDecimal.ZERO;
    BigDecimal remainingDiscount = discount;
    for (int i = 0; i < items.size(); i++) {
      QuoteItem item = items.get(i);
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
}
