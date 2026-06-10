package com.myvision.api.exception;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException exception) {
    Map<String, String> fields = new LinkedHashMap<>();
    for (FieldError error : exception.getBindingResult().getFieldErrors()) {
      fields.put(error.getField(), error.getDefaultMessage());
    }

    return ResponseEntity
        .badRequest()
        .body(ApiError.of("Validation failed", "VALIDATION_ERROR", fields));
  }

  @ExceptionHandler(BadRequestException.class)
  public ResponseEntity<ApiError> handleBadRequest(BadRequestException exception) {
    return ResponseEntity
        .badRequest()
        .body(ApiError.of(exception.getMessage(), "BAD_REQUEST"));
  }

  @ExceptionHandler(ResourceNotFoundException.class)
  public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException exception) {
    return ResponseEntity
        .status(HttpStatus.NOT_FOUND)
        .body(ApiError.of(exception.getMessage(), "NOT_FOUND"));
  }

  @ExceptionHandler(UnauthorizedException.class)
  public ResponseEntity<ApiError> handleUnauthorized(UnauthorizedException exception) {
    return ResponseEntity
        .status(HttpStatus.UNAUTHORIZED)
        .body(ApiError.of(exception.getMessage(), "UNAUTHORIZED"));
  }

  @ExceptionHandler(ForbiddenException.class)
  public ResponseEntity<ApiError> handleForbidden(ForbiddenException exception) {
    return ResponseEntity
        .status(HttpStatus.FORBIDDEN)
        .body(ApiError.of(exception.getMessage(), "FORBIDDEN"));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiError> handleAccessDenied(AccessDeniedException exception) {
    return ResponseEntity
        .status(HttpStatus.FORBIDDEN)
        .body(ApiError.of("Access denied", "FORBIDDEN"));
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiError> handleUnreadable(HttpMessageNotReadableException exception) {
    return ResponseEntity
        .badRequest()
        .body(ApiError.of("Malformed request body", "BAD_REQUEST"));
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiError> handleDataIntegrity(DataIntegrityViolationException exception) {
    log.warn("Data integrity violation", exception);
    return ResponseEntity
        .status(HttpStatus.CONFLICT)
        .body(ApiError.of("The request conflicts with existing data", "CONFLICT"));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiError> handleUnexpected(Exception exception) {
    log.error("Unexpected error", exception);
    return ResponseEntity
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .body(ApiError.of("An unexpected error occurred", "INTERNAL_ERROR"));
  }
}

