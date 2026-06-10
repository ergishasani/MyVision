package com.myvision.api.project;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProjectResponse(
    UUID id,
    UUID clientId,
    String name,
    String code,
    String status,
    String jobSiteAddressLine1,
    String jobSiteAddressLine2,
    String jobSiteCity,
    String jobSiteRegion,
    String jobSitePostalCode,
    String jobSiteCountryCode,
    LocalDate startDate,
    LocalDate endDate,
    BigDecimal budgetAmount,
    String currency,
    String description,
    OffsetDateTime createdAt,
    OffsetDateTime updatedAt
) {

  public static ProjectResponse from(Project project) {
    return new ProjectResponse(
        project.getId(),
        project.getClientId(),
        project.getName(),
        project.getCode(),
        project.getStatus().name(),
        project.getJobSiteAddressLine1(),
        project.getJobSiteAddressLine2(),
        project.getJobSiteCity(),
        project.getJobSiteRegion(),
        project.getJobSitePostalCode(),
        project.getJobSiteCountryCode(),
        project.getStartDate(),
        project.getEndDate(),
        project.getBudgetAmount(),
        project.getCurrency(),
        project.getDescription(),
        project.getCreatedAt(),
        project.getUpdatedAt()
    );
  }
}
