package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.service.CompanyAccessService;
import com.myvision.api.exception.ResourceNotFoundException;
import java.time.OffsetDateTime;
import com.myvision.api.entity.ClientType;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import com.myvision.api.entity.Company;
import com.myvision.api.entity.ContactRole;
import com.myvision.api.entity.DiscountUnit;
import com.myvision.api.entity.NumberRangeType;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.repository.CompanyRepository;
import com.myvision.api.repository.ProjectRepository;
import com.myvision.api.repository.QuoteRepository;
import com.myvision.api.repository.InvoiceRepository;
import com.myvision.api.dto.ContactDetailInput;
import com.myvision.api.dto.ContactDetailResponse;
import com.myvision.api.entity.ClientContactDetail;
import com.myvision.api.entity.ContactDetailKind;
import com.myvision.api.entity.ContactDetailLabel;
import com.myvision.api.repository.ClientContactDetailRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.Objects;
import java.util.function.Function;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientService {

  /**
   * Issued and not cancelled — what counts as having been billed. Kept identical to the dashboard's
   * definition so a contact's total and the company total cannot tell different stories.
   */
  private static final List<InvoiceStatus> INVOICED_STATUSES = List.of(
      InvoiceStatus.sent, InvoiceStatus.unpaid, InvoiceStatus.partially_paid,
      InvoiceStatus.paid, InvoiceStatus.overdue);

  /** Issued and still owing money. */
  private static final List<InvoiceStatus> OUTSTANDING_STATUSES = List.of(
      InvoiceStatus.sent, InvoiceStatus.unpaid, InvoiceStatus.partially_paid,
      InvoiceStatus.overdue);

  /** A quote that could still turn into an invoice. */
  private static final List<QuoteStatus> OPEN_QUOTE_STATUSES =
      List.of(QuoteStatus.draft, QuoteStatus.sent);

  private final ClientRepository clientRepository;
  private final CompanyAccessService companyAccessService;
  private final CompanyRepository companyRepository;
  private final ClientContactDetailRepository contactDetailRepository;
  private final NumberRangeService numberRangeService;
  private final InvoiceRepository invoiceRepository;
  private final QuoteRepository quoteRepository;
  private final ProjectRepository projectRepository;

  public ClientService(
      ClientRepository clientRepository,
      CompanyAccessService companyAccessService,
      CompanyRepository companyRepository,
      ClientContactDetailRepository contactDetailRepository,
      NumberRangeService numberRangeService,
      InvoiceRepository invoiceRepository,
      QuoteRepository quoteRepository,
      ProjectRepository projectRepository
  ) {
    this.clientRepository = clientRepository;
    this.companyAccessService = companyAccessService;
    this.companyRepository = companyRepository;
    this.contactDetailRepository = contactDetailRepository;
    this.numberRangeService = numberRangeService;
    this.invoiceRepository = invoiceRepository;
    this.quoteRepository = quoteRepository;
    this.projectRepository = projectRepository;
  }

  @Transactional(readOnly = true)
  public List<ClientResponse> list(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return clientRepository.findByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(companyId)
        .stream()
        .map(ClientResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public ClientResponse get(UUID userId, UUID clientId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Client client = requireClient(clientId, companyId);
    return ClientResponse.from(client, detailsFor(client.getId()));
  }

  /**
   * Everything the contact detail screen shows: who they are, what they are worth, and every
   * document issued to them.
   *
   * <p>Assembled in one transaction rather than left to four calls from the browser. The headline
   * figures have to agree with the rows printed underneath them, and separate requests can
   * interleave with a payment landing and disagree — an outstanding total that does not match the
   * invoices below it reads as a bug in the books.
   */
  @Transactional(readOnly = true)
  public ClientOverviewResponse overview(UUID userId, UUID clientId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Client client = requireClient(clientId, companyId);

    List<Invoice> invoices = invoiceRepository
        .findByCompanyIdAndClientIdOrderByIssueDateDescCreatedAtDesc(companyId, clientId);
    List<Quote> quotes = quoteRepository
        .findByCompanyIdAndClientIdOrderByIssueDateDescCreatedAtDesc(companyId, clientId);
    List<Project> projects =
        projectRepository.findByCompanyIdAndClientIdOrderByCreatedAtDesc(companyId, clientId);

    return new ClientOverviewResponse(
        ClientResponse.from(client, detailsFor(client.getId())),
        stats(companyId, invoices, quotes, projects),
        invoices.stream().map(ClientInvoiceSummaryResponse::from).toList(),
        quotes.stream().map(ClientQuoteSummaryResponse::from).toList(),
        projects.stream().map(ProjectResponse::from).toList());
  }

  /**
   * The headline figures for one contact.
   *
   * <p>Counts cover every document; the money sums cover only the primary currency, and anything
   * left out is named in {@code excludedCurrencies}. Adding 1.000 EUR to 1.000 CHF produces a
   * number that is true of nothing, so the sum stays in one unit and the screen says what it
   * omitted.
   */
  private ClientStatsResponse stats(
      UUID companyId, List<Invoice> invoices, List<Quote> quotes, List<Project> projects) {
    LocalDate today = LocalDate.now();
    String currency = primaryCurrency(companyId, invoices);

    List<Invoice> billed = invoices.stream()
        .filter(invoice -> currency.equals(invoice.getCurrency()))
        .toList();
    List<String> excluded = invoices.stream()
        .map(Invoice::getCurrency)
        .filter(code -> code != null && !code.isBlank() && !currency.equals(code))
        .distinct()
        .sorted()
        .toList();

    // Derived from the due date rather than read off the status. The overdue sweep runs once a
    // day, so between the due date and the next sweep a late invoice is still stored as `sent`.
    List<Invoice> overdue = billed.stream()
        .filter(invoice -> OUTSTANDING_STATUSES.contains(invoice.getStatus()))
        .filter(invoice -> invoice.getDueDate() != null && invoice.getDueDate().isBefore(today))
        .toList();

    List<LocalDate> issuedDates = invoices.stream()
        .filter(invoice -> INVOICED_STATUSES.contains(invoice.getStatus()))
        .map(Invoice::getIssueDate)
        .filter(Objects::nonNull)
        .sorted()
        .toList();

    List<Quote> openQuotes = quotes.stream()
        .filter(quote -> OPEN_QUOTE_STATUSES.contains(quote.getStatus()))
        .toList();

    return new ClientStatsResponse(
        currency,
        excluded,
        sum(billed, INVOICED_STATUSES, Invoice::getTotalAmount),
        sum(billed, INVOICED_STATUSES, Invoice::getAmountPaid),
        sum(billed, OUTSTANDING_STATUSES, Invoice::getBalanceDue),
        overdue.stream()
            .map(Invoice::getBalanceDue)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add),
        invoices.size(),
        invoices.stream().filter(invoice -> invoice.getStatus() == InvoiceStatus.draft).count(),
        invoices.stream()
            .filter(invoice -> OUTSTANDING_STATUSES.contains(invoice.getStatus()))
            .count(),
        overdue.size(),
        quotes.size(),
        openQuotes.size(),
        openQuotes.stream()
            .filter(quote -> currency.equals(quote.getCurrency()))
            .map(Quote::getTotalAmount)
            .filter(Objects::nonNull)
            .reduce(BigDecimal.ZERO, BigDecimal::add),
        projects.size(),
        projects.stream().filter(project -> project.getStatus() == ProjectStatus.active).count(),
        issuedDates.isEmpty() ? null : issuedDates.get(0),
        issuedDates.isEmpty() ? null : issuedDates.get(issuedDates.size() - 1),
        averageDaysToPay(invoices));
  }

  /**
   * How long this contact takes to settle, averaged over the invoices they have paid.
   *
   * <p>Null until one has been paid — a made-up zero would read as "pays immediately", which is
   * the opposite of "we do not know yet". A settlement recorded before the issue date is dropped
   * rather than counted as negative days; it means a back-dated payment, not a fast payer.
   */
  private static Integer averageDaysToPay(List<Invoice> invoices) {
    long[] days = invoices.stream()
        .filter(invoice -> invoice.getPaidAt() != null && invoice.getIssueDate() != null)
        .mapToLong(invoice ->
            ChronoUnit.DAYS.between(invoice.getIssueDate(), invoice.getPaidAt().toLocalDate()))
        .filter(value -> value >= 0)
        .toArray();
    if (days.length == 0) {
      return null;
    }
    long total = 0;
    for (long value : days) {
      total += value;
    }
    return Math.toIntExact(Math.round((double) total / days.length));
  }

  /**
   * The currency this contact is billed in.
   *
   * <p>Taken from their most recent issued invoice, because that is what they have actually been
   * charged in. Drafts are ignored — an unsent draft in another currency should not relabel a
   * history of euro invoices. With no invoices at all the company default gives the screen a unit
   * to show zeroes in.
   */
  private String primaryCurrency(UUID companyId, List<Invoice> invoices) {
    return invoices.stream()
        .filter(invoice -> invoice.getStatus() != InvoiceStatus.draft)
        .map(Invoice::getCurrency)
        .filter(code -> code != null && !code.isBlank())
        .findFirst()
        .orElseGet(() -> companyRepository.findById(companyId)
            .map(Company::getDefaultCurrency)
            .orElse("EUR"));
  }

  private static BigDecimal sum(
      List<Invoice> invoices, List<InvoiceStatus> statuses, Function<Invoice, BigDecimal> field) {
    return invoices.stream()
        .filter(invoice -> statuses.contains(invoice.getStatus()))
        .map(field)
        .filter(Objects::nonNull)
        .reduce(BigDecimal.ZERO, BigDecimal::add);
  }

  @Transactional
  public ClientResponse create(UUID userId, ClientRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);

    Client client = new Client();
    client.setCompanyId(companyId);
    client.setType(request.type() != null ? request.type() : ClientType.business);
    client.setName(request.name().trim());
    client.setContactName(request.contactName());
    client.setSalutation(request.salutation());
    client.setAcademicTitle(request.academicTitle());
    client.setFirstName(request.firstName());
    client.setLastName(request.lastName());
    client.setNameSuffix(request.nameSuffix());
    client.setPosition(request.position());
    client.setContactRole(request.contactRole() != null ? request.contactRole() : ContactRole.customer);
    client.setDebtorNumber(request.debtorNumber());
    client.setCreditorNumber(request.creditorNumber());
    client.setIban(request.iban());
    client.setBic(request.bic());
    client.setTaxNumber(request.taxNumber());
    client.setPaymentTermsDays(request.paymentTermsDays());
    client.setDiscountDays(request.discountDays());
    client.setDiscountPercent(request.discountPercent());
    client.setCustomerDiscount(request.customerDiscount());
    client.setCustomerDiscountUnit(
        request.customerDiscountUnit() != null ? request.customerDiscountUnit() : DiscountUnit.percent);
    client.setTerms(request.terms());
    client.setShowVatId(Boolean.TRUE.equals(request.showVatId()));
    client.setEinvoiceStandard(Boolean.TRUE.equals(request.einvoiceStandard()));
    client.setCustomerNumber(assignCustomerNumber(companyId, request.customerNumber()));
    client.setName(displayName(client, request.name()));
    client.setEmail(request.email());
    client.setPhone(request.phone());
    client.setVatNumber(request.vatNumber());
    client.setAddressLine1(request.addressLine1());
    client.setAddressLine2(request.addressLine2());
    client.setCity(request.city());
    client.setRegion(request.region());
    client.setPostalCode(request.postalCode());
    if (request.countryCode() != null) {
      client.setCountryCode(request.countryCode().toUpperCase());
    }
    client.setNotes(request.notes());

    Client saved = clientRepository.save(client);
    List<ContactDetailResponse> details =
        replaceContactDetails(saved, request.contactDetails());
    syncPrimaryContacts(saved);
    return ClientResponse.from(clientRepository.save(saved), details);
  }

  @Transactional
  public ClientResponse update(UUID userId, UUID clientId, ClientUpdateRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Client client = requireClient(clientId, companyId);

    if (request.type() != null) {
      client.setType(request.type());
    }
    if (request.name() != null) {
      client.setName(request.name().trim());
    }
    if (request.contactName() != null) {
      client.setContactName(request.contactName());
    }
    if (request.salutation() != null) {
      client.setSalutation(request.salutation());
    }
    if (request.academicTitle() != null) {
      client.setAcademicTitle(request.academicTitle());
    }
    if (request.firstName() != null) {
      client.setFirstName(request.firstName());
    }
    if (request.lastName() != null) {
      client.setLastName(request.lastName());
    }
    if (request.nameSuffix() != null) {
      client.setNameSuffix(request.nameSuffix());
    }
    if (request.position() != null) {
      client.setPosition(request.position());
    }
    if (request.contactRole() != null) {
      client.setContactRole(request.contactRole());
    }
    if (request.debtorNumber() != null) {
      client.setDebtorNumber(request.debtorNumber());
    }
    if (request.creditorNumber() != null) {
      client.setCreditorNumber(request.creditorNumber());
    }
    if (request.iban() != null) {
      client.setIban(request.iban());
    }
    if (request.bic() != null) {
      client.setBic(request.bic());
    }
    if (request.taxNumber() != null) {
      client.setTaxNumber(request.taxNumber());
    }
    if (request.showVatId() != null) {
      client.setShowVatId(request.showVatId());
    }
    if (request.einvoiceStandard() != null) {
      client.setEinvoiceStandard(request.einvoiceStandard());
    }
    if (request.paymentTermsDays() != null) {
      client.setPaymentTermsDays(request.paymentTermsDays());
    }
    if (request.discountDays() != null) {
      client.setDiscountDays(request.discountDays());
    }
    if (request.discountPercent() != null) {
      client.setDiscountPercent(request.discountPercent());
    }
    if (request.customerDiscount() != null) {
      client.setCustomerDiscount(request.customerDiscount());
    }
    if (request.customerDiscountUnit() != null) {
      client.setCustomerDiscountUnit(request.customerDiscountUnit());
    }
    if (request.terms() != null) {
      client.setTerms(request.terms());
    }
    if (request.customerNumber() != null
        && !request.customerNumber().equals(client.getCustomerNumber())) {
      requireNumberFree(companyId, request.customerNumber());
      client.setCustomerNumber(request.customerNumber());
    }
    // Recomputed after the parts are patched, so editing a surname updates the name that
    // documents render.
    client.setName(displayName(client, client.getName()));
    if (request.email() != null) {
      client.setEmail(request.email());
    }
    if (request.phone() != null) {
      client.setPhone(request.phone());
    }
    if (request.vatNumber() != null) {
      client.setVatNumber(request.vatNumber());
    }
    if (request.addressLine1() != null) {
      client.setAddressLine1(request.addressLine1());
    }
    if (request.addressLine2() != null) {
      client.setAddressLine2(request.addressLine2());
    }
    if (request.city() != null) {
      client.setCity(request.city());
    }
    if (request.region() != null) {
      client.setRegion(request.region());
    }
    if (request.postalCode() != null) {
      client.setPostalCode(request.postalCode());
    }
    if (request.countryCode() != null) {
      client.setCountryCode(request.countryCode().toUpperCase());
    }
    if (request.notes() != null) {
      client.setNotes(request.notes());
    }

    // Replace details only when the caller supplied them; a null list means "unchanged".
    List<ContactDetailResponse> details = replaceContactDetails(client, request.contactDetails());
    if (request.contactDetails() != null) {
      syncPrimaryContacts(client);
    }
    return ClientResponse.from(clientRepository.save(client), details);
  }

  @Transactional
  public void archive(UUID userId, UUID clientId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Client client = requireClient(clientId, companyId);
    if (client.getArchivedAt() == null) {
      client.setArchivedAt(OffsetDateTime.now());
      clientRepository.save(client);
    }
  }

  /**
   * Deletes a contact outright.
   *
   * <p>Only possible while nothing references them. An invoice has to keep the name and address it
   * was issued to — that is what makes it a valid invoice, and German retention rules expect it to
   * still be there years later — so a contact who has been invoiced can be archived but never
   * removed. The foreign keys are {@code on delete restrict}, so the database would refuse anyway;
   * counting first turns that into a sentence the operator can act on instead of a 500.
   */
  @Transactional
  public void delete(UUID userId, UUID clientId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Client client = requireClient(clientId, companyId);

    long invoices = invoiceRepository.countByClientId(clientId);
    long quotes = quoteRepository.countByClientId(clientId);
    long projects = projectRepository.countByClientId(clientId);

    if (invoices + quotes + projects > 0) {
      throw new BadRequestException(
          "This contact cannot be deleted because " + describe(invoices, quotes, projects)
              + " still reference them. Archive them instead — the documents have to keep the"
              + " contact they were issued to.");
    }

    // Contact details cascade; nothing else points here.
    clientRepository.delete(client);
  }

  /** "2 invoices and 1 project", for a message that says what is actually in the way. */
  private static String describe(long invoices, long quotes, long projects) {
    List<String> parts = new ArrayList<>();
    if (invoices > 0) {
      parts.add(invoices + (invoices == 1 ? " invoice" : " invoices"));
    }
    if (quotes > 0) {
      parts.add(quotes + (quotes == 1 ? " quote" : " quotes"));
    }
    if (projects > 0) {
      parts.add(projects + (projects == 1 ? " project" : " projects"));
    }
    if (parts.size() == 1) {
      return parts.get(0);
    }
    return String.join(", ", parts.subList(0, parts.size() - 1))
        + " and " + parts.get(parts.size() - 1);
  }

  /** Tenant-safe lookup used by the project, quote and invoice domains. */
  public Client requireActiveClient(UUID clientId, UUID companyId) {
    return clientRepository.findByIdAndCompanyIdAndArchivedAtIsNull(clientId, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
  }

  private Client requireClient(UUID clientId, UUID companyId) {
    return clientRepository.findByIdAndCompanyId(clientId, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Client not found"));
  }

  /**
   * The name documents render.
   *
   * <p>An individual's display name is rebuilt from the structured parts so an invoice can be
   * addressed formally ("Frau Dr. Erika Mustermann"). Organisations keep the name as entered.
   * The column stays non-null either way, so existing PDF and XRechnung rendering is unaffected.
   */
  private static String displayName(Client client, String fallback) {
    if (client.getType() == ClientType.individual) {
      String composed = Stream.of(
              client.getSalutation(),
              client.getAcademicTitle(),
              client.getFirstName(),
              client.getLastName(),
              client.getNameSuffix())
          .filter(part -> part != null && !part.isBlank())
          .map(String::trim)
          .collect(Collectors.joining(" "));
      if (!composed.isBlank()) {
        return composed;
      }
    }
    return fallback == null ? "" : fallback.trim();
  }

  /**
   * Assigns the contact's customer number.
   *
   * <p>An explicit number is honoured, because businesses migrating from another system need
   * their existing references to carry over. Otherwise one is taken from the company counter
   * under the same pessimistic lock invoice numbering uses, so two contacts created at the same
   * moment cannot receive the same number.
   *
   * <p>The counter only moves forward. A number already in use is rejected rather than silently
   * reassigned: it identifies the contact in the accountant's books.
   */
  private Integer assignCustomerNumber(UUID companyId, Integer requested) {
    if (requested != null) {
      requireNumberFree(companyId, requested);
      // Push the counter past an explicitly chosen number so it is not handed out again later.
      numberRangeService.observeUsed(companyId, NumberRangeType.contact, requested);
      return requested;
    }
    return numberRangeService.allocateNumber(companyId, NumberRangeType.contact);
  }

  private void requireNumberFree(UUID companyId, Integer number) {
    if (clientRepository.existsByCompanyIdAndCustomerNumber(companyId, number)) {
      throw new BadRequestException("Customer number " + number + " is already in use");
    }
  }

  /** The number the next contact would receive, so a create form can show it before saving. */
  @Transactional(readOnly = true)
  public int peekNextCustomerNumber(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return numberRangeService.peek(companyId, NumberRangeType.contact);
  }

  /**
   * Replaces a client's contact details with the supplied list.
   *
   * <p>Replace rather than merge: the form always sends the complete set, so a removed row has to
   * disappear. A null list means "not supplied" and leaves the existing rows alone, which is what
   * PATCH semantics require.
   */
  private List<ContactDetailResponse> replaceContactDetails(
      Client client, List<ContactDetailInput> inputs) {
    if (inputs == null) {
      return contactDetailRepository.findByClientIdOrderByKindAscPositionAsc(client.getId())
          .stream().map(ContactDetailResponse::from).toList();
    }

    contactDetailRepository.deleteByClientId(client.getId());
    contactDetailRepository.flush();

    Map<ContactDetailKind, Integer> positions = new EnumMap<>(ContactDetailKind.class);
    List<ClientContactDetail> saved = new ArrayList<>();
    for (ContactDetailInput input : inputs) {
      if (input.value() == null || input.value().isBlank()) {
        continue;
      }
      ClientContactDetail detail = new ClientContactDetail();
      detail.setClientId(client.getId());
      detail.setCompanyId(client.getCompanyId());
      detail.setKind(input.kind());
      detail.setLabel(input.label() != null ? input.label() : ContactDetailLabel.work);
      detail.setValue(input.value().trim());
      detail.setPosition(positions.merge(input.kind(), 0, (existing, ignored) -> existing + 1));
      saved.add(detail);
    }
    contactDetailRepository.saveAll(saved);
    return saved.stream().map(ContactDetailResponse::from).toList();
  }

  /**
   * Keeps clients.email and clients.phone in step with the detail rows.
   *
   * <p>Invoice delivery and the PDF template read those columns, so they must stay populated. A
   * detail labelled `billing` wins, because that is where an invoice is meant to go; otherwise the
   * first entry of the kind is used.
   */
  private void syncPrimaryContacts(Client client) {
    List<ClientContactDetail> details =
        contactDetailRepository.findByClientIdOrderByKindAscPositionAsc(client.getId());
    client.setEmail(primaryOf(details, ContactDetailKind.email));
    client.setPhone(primaryOf(details, ContactDetailKind.phone));
  }

  private static String primaryOf(List<ClientContactDetail> details, ContactDetailKind kind) {
    List<ClientContactDetail> ofKind = details.stream()
        .filter(detail -> detail.getKind() == kind)
        .toList();
    if (ofKind.isEmpty()) {
      return null;
    }
    return ofKind.stream()
        .filter(detail -> detail.getLabel() == ContactDetailLabel.billing)
        .findFirst()
        .orElse(ofKind.get(0))
        .getValue();
  }

  private List<ContactDetailResponse> detailsFor(UUID clientId) {
    return contactDetailRepository.findByClientIdOrderByKindAscPositionAsc(clientId)
        .stream().map(ContactDetailResponse::from).toList();
  }
}
