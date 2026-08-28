package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ClientResponse(
    UUID id,
    String type,
    String name,
    String contactName,
    String salutation,
    String academicTitle,
    String firstName,
    String lastName,
    String nameSuffix,
    String position,
    String contactRole,
    Integer customerNumber,
    String debtorNumber,
    String creditorNumber,
    String iban,
    String bic,
    String taxNumber,
    Boolean showVatId,
    Boolean einvoiceStandard,
    Integer paymentTermsDays,
    Integer discountDays,
    BigDecimal discountPercent,
    BigDecimal customerDiscount,
    String customerDiscountUnit,
    String terms,
    java.util.List<ContactDetailResponse> contactDetails,
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
    return from(client, java.util.List.of());
  }

  public static ClientResponse from(Client client, java.util.List<ContactDetailResponse> details) {
    return new ClientResponse(
        client.getId(),
        client.getType().name(),
        client.getName(),
        client.getContactName(),
        client.getSalutation(),
        client.getAcademicTitle(),
        client.getFirstName(),
        client.getLastName(),
        client.getNameSuffix(),
        client.getPosition(),
        client.getContactRole().name(),
        client.getCustomerNumber(),
        client.getDebtorNumber(),
        client.getCreditorNumber(),
        client.getIban(),
        client.getBic(),
        client.getTaxNumber(),
        client.getShowVatId(),
        client.getEinvoiceStandard(),
        client.getPaymentTermsDays(),
        client.getDiscountDays(),
        client.getDiscountPercent(),
        client.getCustomerDiscount(),
        client.getCustomerDiscountUnit().name(),
        client.getTerms(),
        details,
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
