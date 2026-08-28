package com.myvision.api.dto;

import com.myvision.api.entity.CompanyMemberRole;
import jakarta.validation.constraints.NotNull;

/** Change a member's role. */
public record TeamMemberUpdateRequest(
    @NotNull CompanyMemberRole role
) {
}
