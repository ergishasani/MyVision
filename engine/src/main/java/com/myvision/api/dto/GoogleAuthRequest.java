package com.myvision.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoogleAuthRequest(
    @NotBlank
    String idToken,

    @Size(max = 180)
    String companyName
) {
}
