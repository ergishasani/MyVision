package com.myvision.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AppleAuthRequest(
    @NotBlank
    String identityToken,

    @Size(max = 160)
    String fullName,

    @Size(max = 180)
    String companyName
) {
}
