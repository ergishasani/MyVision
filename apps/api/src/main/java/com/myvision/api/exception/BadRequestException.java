package com.myvision.api.exception;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

public class BadRequestException extends RuntimeException {

  public BadRequestException(String message) {
    super(message);
  }
}

