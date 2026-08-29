package com.myvision.api.controller;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.util.CurrentUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
@RequestMapping("/api/delivery-notes")
@Tag(name = "Delivery notes", description = "What was handed over, and when. Not a tax document.")
public class DeliveryNoteController {

  private final DeliveryNoteService deliveryNoteService;

  public DeliveryNoteController(DeliveryNoteService deliveryNoteService) {
    this.deliveryNoteService = deliveryNoteService;
  }

  @GetMapping
  public List<DeliveryNoteResponse> list(@AuthenticationPrincipal CurrentUserPrincipal principal) {
    return deliveryNoteService.list(principal.getUserId());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public DeliveryNoteResponse create(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @Valid @RequestBody DeliveryNoteRequest request
  ) {
    return deliveryNoteService.create(principal.getUserId(), request);
  }

  @GetMapping("/next-number")
  @Operation(summary = "Preview the number the next delivery note would receive")
  public Map<String, String> nextNumber(
      @AuthenticationPrincipal CurrentUserPrincipal principal
  ) {
    String preview = deliveryNoteService.peekNextNumber(principal.getUserId());
    return preview == null ? Map.of() : Map.of("nextNumber", preview);
  }

  @GetMapping("/{id}")
  public DeliveryNoteResponse get(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return deliveryNoteService.get(principal.getUserId(), id);
  }

  @PatchMapping("/{id}")
  public DeliveryNoteResponse update(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody DeliveryNoteUpdateRequest request
  ) {
    return deliveryNoteService.update(principal.getUserId(), id, request);
  }

  @PostMapping("/{id}/mark-sent")
  public DeliveryNoteResponse markSent(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return deliveryNoteService.markSent(principal.getUserId(), id);
  }

  @PostMapping("/{id}/mark-delivered")
  public DeliveryNoteResponse markDelivered(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return deliveryNoteService.markDelivered(principal.getUserId(), id);
  }

  @PostMapping("/{id}/cancel")
  public DeliveryNoteResponse cancel(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return deliveryNoteService.cancel(principal.getUserId(), id);
  }
}
