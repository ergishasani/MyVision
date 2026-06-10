package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.dto.CompanyResponse;

public record AuthResponse(
    String token,
    String refreshToken,
    long expiresInMs,
    UserResponse user,
    CompanyResponse company
) {
}
