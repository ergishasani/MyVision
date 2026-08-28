package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

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

