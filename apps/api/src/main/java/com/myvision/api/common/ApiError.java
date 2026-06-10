package com.myvision.api.common;

import java.time.OffsetDateTime;
import java.util.Map;

public record ApiError(
    String message,
    String code,
    OffsetDateTime timestamp,
    Map<String, String> fields
) {

  public static ApiError of(String message, String code) {
    return new ApiError(message, code, OffsetDateTime.now(), Map.of());
  }

  public static ApiError of(String message, String code, Map<String, String> fields) {
    return new ApiError(message, code, OffsetDateTime.now(), fields);
  }
}

