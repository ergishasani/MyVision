package com.myvision.api.auth;

import com.myvision.api.company.CompanyResponse;

public record AuthResponse(
    String token,
    UserResponse user,
    CompanyResponse company
) {
}

