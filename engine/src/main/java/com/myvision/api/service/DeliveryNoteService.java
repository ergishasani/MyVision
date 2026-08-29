package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Delivery notes.
 *
 * <p>Modelled on quotes, because the shape is the same — a numbered document with lines and a
 * customer — but the lifecycle is not. A delivery note is never converted, never paid, and never
 * owed: it records what was handed over. The amounts on it are descriptive, restating the invoice
 * for the customer's benefit, and no tax point arises from issuing one.
 *
 * <p>The tax arithmetic is copied from the quote and invoice path rather than rewritten. Two
 * implementations of "spread a document discount across lines and then charge VAT" would drift,
 * and this is exactly the arithmetic that must not.
 */
@Service
public class DeliveryNoteService {

  private final DeliveryNoteRepository deliveryNoteRepository;
  private final DeliveryNoteItemRepository deliveryNoteItemRepository;
  private final CompanyRepository companyRepository;
  private final ClientService clientService;
  private final CompanyAccessService companyAccessService;
  private final NumberRangeService numberRangeService;
  private final AuditLogService auditLogService;

  public DeliveryNoteService(
      DeliveryNoteRepository deliveryNoteRepository,
      DeliveryNoteItemRepository deliveryNoteItemRepository,
      CompanyRepository companyRepository,
      ClientService clientService,
      CompanyAccessService companyAccessService,
      NumberRangeService numberRangeService,
      AuditLogService auditLogService
  ) {
    this.deliveryNoteRepository = deliveryNoteRepository;
    this.deliveryNoteItemRepository = deliveryNoteItemRepository;
    this.companyRepository = companyRepository;
    this.clientService = clientService;
    this.companyAccessService = companyAccessService;
    this.numberRangeService = numberRangeService;
    this.auditLogService = auditLogService;
  }

  @Transactional(readOnly = true)
  public List<DeliveryNoteResponse> list(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return deliveryNoteRepository
        .findByCompanyIdOrderByDeliveryDateDescCreatedAtDesc(companyId)
        .stream()
        .map(note -> DeliveryNoteResponse.from(
            note, deliveryNoteItemRepository.findByDeliveryNoteIdOrderByPositionAsc(note.getId())))
        .toList();
  }

  @Transactional(readOnly = true)
  public DeliveryNoteResponse get(UUID userId, UUID id) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return toResponse(requireNote(id, companyId));
  }

  @Transactional
  public DeliveryNoteResponse create(UUID userId, DeliveryNoteRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Company company = requireCompany(companyId);
    Client client = clientService.requireActiveClient(request.clientId(), companyId);

    DeliveryNote note = new DeliveryNote();
    note.setCompanyId(companyId);
    note.setClientId(client.getId());
    note.setProjectId(request.projectId());
    note.setInvoiceId(request.invoiceId());
    note.setQuoteId(request.quoteId());
    note.setDeliveryNoteNumber(
        numberRangeService.allocate(companyId, NumberRangeType.delivery_note));
    note.setStatus(DeliveryNoteStatus.draft);
    note.setSubject(request.subject());
    note.setDeliveryDate(
        request.deliveryDate() != null ? request.deliveryDate() : LocalDate.now());
    note.setReference(request.reference());
    note.setCurrency(request.currency() != null
        ? request.currency().toUpperCase()
        : company.getDefaultCurrency());
    note.setDiscountAmount(request.discountAmount() != null
        ? request.discountAmount()
        : BigDecimal.ZERO);
    note.setHeaderText(request.headerText());
    note.setFooterText(request.footerText());
    applyDeliveryAddress(note, request, client);

    note = deliveryNoteRepository.save(note);
    List<DeliveryNoteItem> items = saveItems(note.getId(), request.items());
    applyTotals(note, items);
    note = deliveryNoteRepository.save(note);

    auditLogService.record(
        companyId, userId, "delivery_note", note.getId(), "created",
        "{\"deliveryNoteNumber\":\"%s\"}".formatted(note.getDeliveryNoteNumber()));

    return DeliveryNoteResponse.from(note, items);
  }

  @Transactional
  public DeliveryNoteResponse update(UUID userId, UUID id, DeliveryNoteUpdateRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    DeliveryNote note = requireNote(id, companyId);

    // Only a draft is editable. Once it has gone to the customer it is a record of what they were
    // told was delivered, and quietly rewriting that is how disputes become unanswerable.
    if (note.getStatus() != DeliveryNoteStatus.draft) {
      throw new BadRequestException("Only a draft delivery note can be edited");
    }

    if (request.clientId() != null) {
      note.setClientId(clientService.requireActiveClient(request.clientId(), companyId).getId());
    }
    if (request.projectId() != null) {
      note.setProjectId(request.projectId());
    }
    if (request.subject() != null) {
      note.setSubject(request.subject());
    }
    if (request.deliveryDate() != null) {
      note.setDeliveryDate(request.deliveryDate());
    }
    if (request.reference() != null) {
      note.setReference(request.reference());
    }
    if (request.deliveryAddressLine1() != null) {
      note.setDeliveryAddressLine1(request.deliveryAddressLine1());
    }
    if (request.deliveryAddressLine2() != null) {
      note.setDeliveryAddressLine2(request.deliveryAddressLine2());
    }
    if (request.deliveryPostalCode() != null) {
      note.setDeliveryPostalCode(request.deliveryPostalCode());
    }
    if (request.deliveryCity() != null) {
      note.setDeliveryCity(request.deliveryCity());
    }
    if (request.deliveryRegion() != null) {
      note.setDeliveryRegion(request.deliveryRegion());
    }
    if (request.deliveryCountryCode() != null) {
      note.setDeliveryCountryCode(request.deliveryCountryCode().toUpperCase());
    }
    if (request.discountAmount() != null) {
      note.setDiscountAmount(request.discountAmount());
    }
    if (request.headerText() != null) {
      note.setHeaderText(request.headerText());
    }
    if (request.footerText() != null) {
      note.setFooterText(request.footerText());
    }

    // A null item list means "not supplied" and leaves the lines alone, which is what PATCH
    // requires. An empty list would mean "remove every line", and a delivery note with no lines
    // says nothing was delivered — so it is refused rather than silently accepted.
    List<DeliveryNoteItem> items;
    if (request.items() != null) {
      if (request.items().isEmpty()) {
        throw new BadRequestException("A delivery note must have at least one line");
      }
      deliveryNoteItemRepository.deleteByDeliveryNoteId(note.getId());
      deliveryNoteItemRepository.flush();
      items = saveItems(note.getId(), request.items());
    } else {
      items = deliveryNoteItemRepository.findByDeliveryNoteIdOrderByPositionAsc(note.getId());
    }

    applyTotals(note, items);
    note = deliveryNoteRepository.save(note);
    auditLogService.record(companyId, userId, "delivery_note", note.getId(), "updated", "{}");
    return DeliveryNoteResponse.from(note, items);
  }

  @Transactional
  public DeliveryNoteResponse markSent(UUID userId, UUID id) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    DeliveryNote note = requireNote(id, companyId);
    if (note.getStatus() != DeliveryNoteStatus.draft) {
      throw new BadRequestException("Only a draft delivery note can be sent");
    }
    note.setStatus(DeliveryNoteStatus.sent);
    note.setSentAt(OffsetDateTime.now());
    auditLogService.record(companyId, userId, "delivery_note", note.getId(), "marked_sent", "{}");
    return toResponse(deliveryNoteRepository.save(note));
  }

  @Transactional
  public DeliveryNoteResponse markDelivered(UUID userId, UUID id) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    DeliveryNote note = requireNote(id, companyId);
    if (note.getStatus() == DeliveryNoteStatus.cancelled) {
      throw new BadRequestException("A cancelled delivery note cannot be marked as delivered");
    }
    if (note.getStatus() == DeliveryNoteStatus.delivered) {
      throw new BadRequestException("This delivery note is already marked as delivered");
    }
    note.setStatus(DeliveryNoteStatus.delivered);
    note.setDeliveredAt(OffsetDateTime.now());
    auditLogService.record(
        companyId, userId, "delivery_note", note.getId(), "marked_delivered", "{}");
    return toResponse(deliveryNoteRepository.save(note));
  }

  @Transactional
  public DeliveryNoteResponse cancel(UUID userId, UUID id) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    DeliveryNote note = requireNote(id, companyId);
    if (note.getStatus() == DeliveryNoteStatus.cancelled) {
      throw new BadRequestException("This delivery note is already cancelled");
    }
    note.setStatus(DeliveryNoteStatus.cancelled);
    auditLogService.record(companyId, userId, "delivery_note", note.getId(), "cancelled", "{}");
    return toResponse(deliveryNoteRepository.save(note));
  }

  /**
   * The number the next delivery note would get, so the form can show it before saving.
   *
   * <p>A preview only. The number is allocated server-side on create, so two people opening the
   * form at the same moment still end up with different numbers.
   */
  @Transactional(readOnly = true)
  public String peekNextNumber(UUID userId) {
    return numberRangeService.list(userId).stream()
        .filter(range -> NumberRangeType.delivery_note.name().equals(range.type()))
        .map(NumberRangeResponse::preview)
        .findFirst()
        .orElse(null);
  }

  /* --- internals ----------------------------------------------------------- */

  private DeliveryNote requireNote(UUID id, UUID companyId) {
    return deliveryNoteRepository.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Delivery note not found"));
  }

  private Company requireCompany(UUID companyId) {
    return companyRepository.findById(companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
  }

  private DeliveryNoteResponse toResponse(DeliveryNote note) {
    return DeliveryNoteResponse.from(
        note, deliveryNoteItemRepository.findByDeliveryNoteIdOrderByPositionAsc(note.getId()));
  }

  /**
   * Where the goods go.
   *
   * <p>An explicit address wins. With none supplied the contact's own is copied in — copied, not
   * referenced, because the note has to keep the address it was issued against even if the
   * contact moves later.
   */
  private void applyDeliveryAddress(
      DeliveryNote note, DeliveryNoteRequest request, Client client) {
    boolean supplied = request.deliveryAddressLine1() != null
        || request.deliveryCity() != null
        || request.deliveryPostalCode() != null;

    if (supplied) {
      note.setDeliveryAddressLine1(request.deliveryAddressLine1());
      note.setDeliveryAddressLine2(request.deliveryAddressLine2());
      note.setDeliveryPostalCode(request.deliveryPostalCode());
      note.setDeliveryCity(request.deliveryCity());
      note.setDeliveryRegion(request.deliveryRegion());
      note.setDeliveryCountryCode(request.deliveryCountryCode() != null
          ? request.deliveryCountryCode().toUpperCase()
          : null);
      return;
    }

    note.setDeliveryAddressLine1(client.getAddressLine1());
    note.setDeliveryAddressLine2(client.getAddressLine2());
    note.setDeliveryPostalCode(client.getPostalCode());
    note.setDeliveryCity(client.getCity());
    note.setDeliveryRegion(client.getRegion());
    note.setDeliveryCountryCode(client.getCountryCode());
  }

  private List<DeliveryNoteItem> saveItems(UUID noteId, List<DeliveryNoteItemRequest> requests) {
    List<DeliveryNoteItem> items = new ArrayList<>();
    int position = 1;
    for (DeliveryNoteItemRequest itemRequest : requests) {
      DeliveryNoteItem item = new DeliveryNoteItem();
      item.setDeliveryNoteId(noteId);
      item.setPosition(position++);
      item.setKind(itemRequest.kind() != null ? itemRequest.kind() : LineItemKind.service);
      item.setDescription(itemRequest.description().trim());
      item.setQuantity(itemRequest.quantity());
      item.setUnit(itemRequest.unit() != null ? itemRequest.unit() : "pcs");
      item.setUnitPrice(itemRequest.unitPrice() != null
          ? itemRequest.unitPrice()
          : BigDecimal.ZERO);
      item.setTaxRate(itemRequest.taxRate() != null
          ? itemRequest.taxRate()
          : BigDecimal.valueOf(19));
      item.setDiscountAmount(itemRequest.discountAmount() != null
          ? itemRequest.discountAmount()
          : BigDecimal.ZERO);
      item.setLineTotal(lineTotal(item));
      items.add(item);
    }
    return deliveryNoteItemRepository.saveAll(items);
  }

  private BigDecimal lineTotal(DeliveryNoteItem item) {
    return item.getQuantity()
        .multiply(item.getUnitPrice())
        .subtract(item.getDiscountAmount())
        .setScale(2, RoundingMode.HALF_UP);
  }

  private void applyTotals(DeliveryNote note, List<DeliveryNoteItem> items) {
    BigDecimal subtotal = BigDecimal.ZERO;
    for (DeliveryNoteItem item : items) {
      subtotal = subtotal.add(item.getLineTotal());
    }
    BigDecimal discount = note.getDiscountAmount() != null
        ? note.getDiscountAmount()
        : BigDecimal.ZERO;
    if (discount.compareTo(subtotal) > 0) {
      throw new BadRequestException("Discount amount cannot exceed subtotal");
    }

    BigDecimal tax = taxAfterDocumentDiscount(items, subtotal, discount);

    note.setSubtotalAmount(subtotal.setScale(2, RoundingMode.HALF_UP));
    note.setTaxAmount(tax.setScale(2, RoundingMode.HALF_UP));
    note.setTotalAmount(subtotal.subtract(discount).add(tax).setScale(2, RoundingMode.HALF_UP));
  }

  /**
   * VAT once a document-level discount has been spread across the lines.
   *
   * <p>Each line takes its share of the discount and is taxed at its own rate, so a document
   * mixing 19% and 7% lines is still charged correctly. The last line absorbs the rounding
   * remainder, which keeps the spread lines summing exactly to the discount given.
   */
  private BigDecimal taxAfterDocumentDiscount(
      List<DeliveryNoteItem> items,
      BigDecimal subtotal,
      BigDecimal discount
  ) {
    if (subtotal.compareTo(BigDecimal.ZERO) == 0) {
      return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
    }

    BigDecimal tax = BigDecimal.ZERO;
    BigDecimal remainingDiscount = discount;
    for (int i = 0; i < items.size(); i++) {
      DeliveryNoteItem item = items.get(i);
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
