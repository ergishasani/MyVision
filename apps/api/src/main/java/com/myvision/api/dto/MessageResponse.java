package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

public record MessageResponse(
    String message,
    String token
) {

  public static MessageResponse of(String message) {
    return new MessageResponse(message, null);
  }

  public static MessageResponse withToken(String message, String token) {
    return new MessageResponse(message, token);
  }
}
