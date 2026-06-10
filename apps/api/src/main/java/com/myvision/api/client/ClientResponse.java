package com.myvision.api.client;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClientResponse(
    UUID id,
    String type,
    String name,
    String contactName,
    String email,
    String phone,
    String vatNumber,
    String addressLine1,
    String addressLine2,
    String city,
    String region,
    String postalCode,
    String countryCode,
    String notes,
    OffsetDateTime archivedAt,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

  public static ClientResponse from(Client client) {
    return new ClientResponse(
        client.getId(),
        client.getType().name(),
        client.getName(),
        client.getContactName(),
        client.getEmail(),
        client.getPhone(),
        client.getVatNumber(),
        client.getAddressLine1(),
        client.getAddressLine2(),
        client.getCity(),
        client.getRegion(),
        client.getPostalCode(),
        client.getCountryCode(),
        client.getNotes(),
        client.getArchivedAt(),
        client.getCreatedAt(),
        client.getUpdatedAt()
    );
  }
}
