package com.myvision.api.auth;

import java.util.UUID;

public record UserResponse(
    UUID id,
    String email,
    String fullName,
    String phone,
    String status
) {

  public static UserResponse from(User user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getFullName(),
        user.getPhone(),
        user.getStatus().name()
    );
  }
}

