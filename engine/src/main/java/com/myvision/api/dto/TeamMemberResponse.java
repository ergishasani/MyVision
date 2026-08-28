package com.myvision.api.dto;

import com.myvision.api.entity.CompanyMember;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * One person with access to the workspace.
 *
 * <p>Carries the membership id rather than the user id: a role belongs to the membership, and the
 * same person could in principle belong to more than one company.
 */
public record TeamMemberResponse(
    UUID id,
    UUID userId,
    String fullName,
    String email,
    String role,
    String status,
    boolean emailVerified,
    OffsetDateTime lastLoginAt,
    OffsetDateTime joinedAt
) {

  public static TeamMemberResponse from(CompanyMember member) {
    var user = member.getUser();
    return new TeamMemberResponse(
        member.getId(),
        user.getId(),
        user.getFullName(),
        user.getEmail(),
        member.getRole().name(),
        user.getStatus().name(),
        user.getEmailVerifiedAt() != null,
        user.getLastLoginAt(),
        member.getCreatedAt());
  }
}
