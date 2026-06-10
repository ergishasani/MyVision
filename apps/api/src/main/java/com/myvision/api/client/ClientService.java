package com.myvision.api.client;

import com.myvision.api.common.CompanyAccessService;
import com.myvision.api.common.ResourceNotFoundException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientService {

  private final ClientRepository clientRepository;
  private final CompanyAccessService companyAccessService;

  public ClientService(
      ClientRepository clientRepository,
      CompanyAccessService companyAccessService
  ) {
    this.clientRepository = clientRepository;
    this.companyAccessService = companyAccessService;
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
    return ClientResponse.from(requireClient(clientId, companyId));
  }

  @Transactional
  public ClientResponse create(UUID userId, ClientRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);

    Client client = new Client();
    client.setCompanyId(companyId);
    client.setType(request.type() != null ? request.type() : ClientType.business);
    client.setName(request.name().trim());
    client.setContactName(request.contactName());
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

    return ClientResponse.from(clientRepository.save(client));
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

    return ClientResponse.from(clientRepository.save(client));
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
}
