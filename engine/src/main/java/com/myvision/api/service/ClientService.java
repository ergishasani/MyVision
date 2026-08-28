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
import com.myvision.api.dto.ContactDetailInput;
import com.myvision.api.dto.ContactDetailResponse;
import com.myvision.api.entity.ClientContactDetail;
import com.myvision.api.entity.ContactDetailKind;
import com.myvision.api.entity.ContactDetailLabel;
import com.myvision.api.repository.ClientContactDetailRepository;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.Map;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientService {

  private final ClientRepository clientRepository;
  private final CompanyAccessService companyAccessService;
  private final CompanyRepository companyRepository;
  private final ClientContactDetailRepository contactDetailRepository;
  private final NumberRangeService numberRangeService;

  public ClientService(
      ClientRepository clientRepository,
      CompanyAccessService companyAccessService,
      CompanyRepository companyRepository,
      ClientContactDetailRepository contactDetailRepository,
      NumberRangeService numberRangeService
  ) {
    this.clientRepository = clientRepository;
    this.companyAccessService = companyAccessService;
    this.companyRepository = companyRepository;
    this.contactDetailRepository = contactDetailRepository;
    this.numberRangeService = numberRangeService;
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
