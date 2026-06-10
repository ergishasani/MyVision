package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.util.UUID;

public record UserResponse(
    UUID id,
    String email,
    String fullName,
    String phone,
    String status,
    boolean emailVerified
) {

  public static UserResponse from(User user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getFullName(),
        user.getPhone(),
        user.getStatus().name(),
        user.getEmailVerifiedAt() != null
    );
  }
}
