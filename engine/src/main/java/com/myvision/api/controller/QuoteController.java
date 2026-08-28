package com.myvision.api.controller;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.util.CurrentUserPrincipal;
import com.myvision.api.dto.InvoiceResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/quotes")
@Tag(name = "Quotes", description = "Quotes with line items: draft -> sent -> accepted/rejected -> converted")
public class QuoteController {

  private final QuoteService quoteService;

  public QuoteController(QuoteService quoteService) {
    this.quoteService = quoteService;
  }

  @GetMapping
  public List<QuoteResponse> list(@AuthenticationPrincipal CurrentUserPrincipal principal) {
    return quoteService.list(principal.getUserId());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public QuoteResponse create(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @Valid @RequestBody QuoteRequest request
  ) {
    return quoteService.create(principal.getUserId(), request);
  }

  @GetMapping("/{id}")
  public QuoteResponse get(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return quoteService.get(principal.getUserId(), id);
  }

  @PatchMapping("/{id}")
  public QuoteResponse update(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody QuoteUpdateRequest request
  ) {
    return quoteService.update(principal.getUserId(), id, request);
  }

  @PostMapping("/{id}/send")
  public QuoteResponse send(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return quoteService.send(principal.getUserId(), id);
  }

  @PostMapping("/{id}/accept")
  public QuoteResponse accept(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return quoteService.accept(principal.getUserId(), id);
  }

  @PostMapping("/{id}/reject")
  public QuoteResponse reject(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return quoteService.reject(principal.getUserId(), id);
  }

  @PostMapping("/{id}/convert-to-invoice")
  @ResponseStatus(HttpStatus.CREATED)
  public InvoiceResponse convertToInvoice(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return quoteService.convertToInvoice(principal.getUserId(), id);
  }
}
