package com.myvision.api.controller;

import com.myvision.api.dto.BookingAccountRequest;
import com.myvision.api.dto.BookingAccountResponse;
import com.myvision.api.dto.CostCenterRequest;
import com.myvision.api.dto.CostCenterResponse;
import com.myvision.api.dto.NumberRangeResponse;
import com.myvision.api.dto.NumberRangeUpdateRequest;
import com.myvision.api.entity.NumberRangeType;
import com.myvision.api.service.AccountingSettingsService;
import com.myvision.api.service.NumberRangeService;
import com.myvision.api.util.CurrentUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/accounting")
@Tag(name = "Accounting settings", description = "Number ranges, booking accounts, cost centres.")
public class AccountingSettingsController {

  private final NumberRangeService numberRangeService;
  private final AccountingSettingsService accountingSettingsService;

  public AccountingSettingsController(
      NumberRangeService numberRangeService,
      AccountingSettingsService accountingSettingsService
  ) {
    this.numberRangeService = numberRangeService;
    this.accountingSettingsService = accountingSettingsService;
  }

  // --- number ranges -------------------------------------------------------

  @GetMapping("/number-ranges")
  @Operation(summary = "Every numbering counter, including ones not yet used")
  public List<NumberRangeResponse> numberRanges(
      @AuthenticationPrincipal CurrentUserPrincipal principal) {
    return numberRangeService.list(principal.getUserId());
  }

  /**
   * Edits one counter.
   *
   * <p>Raising the next number is allowed; lowering it is rejected with 400. A number already
   * issued cannot be handed out a second time.
   */
  @PatchMapping("/number-ranges/{type}")
  @Operation(summary = "Change a counter's format or move it forward")
  public NumberRangeResponse updateNumberRange(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable NumberRangeType type,
      @Valid @RequestBody NumberRangeUpdateRequest request
  ) {
    return numberRangeService.update(principal.getUserId(), type, request);
  }

  // --- booking accounts ----------------------------------------------------

  @GetMapping("/booking-accounts")
  public List<BookingAccountResponse> bookingAccounts(
      @AuthenticationPrincipal CurrentUserPrincipal principal) {
    return accountingSettingsService.listBookingAccounts(principal.getUserId());
  }

  @PostMapping("/booking-accounts")
  @ResponseStatus(HttpStatus.CREATED)
  public BookingAccountResponse createBookingAccount(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @Valid @RequestBody BookingAccountRequest request
  ) {
    return accountingSettingsService.createBookingAccount(principal.getUserId(), request);
  }

  @PatchMapping("/booking-accounts/{id}")
  public BookingAccountResponse updateBookingAccount(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody BookingAccountRequest request
  ) {
    return accountingSettingsService.updateBookingAccount(principal.getUserId(), id, request);
  }

  @DeleteMapping("/booking-accounts/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void archiveBookingAccount(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    accountingSettingsService.archiveBookingAccount(principal.getUserId(), id);
  }

  // --- cost centres --------------------------------------------------------

  @GetMapping("/cost-centers")
  public List<CostCenterResponse> costCenters(
      @AuthenticationPrincipal CurrentUserPrincipal principal) {
    return accountingSettingsService.listCostCenters(principal.getUserId());
  }

  @PostMapping("/cost-centers")
  @ResponseStatus(HttpStatus.CREATED)
  public CostCenterResponse createCostCenter(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @Valid @RequestBody CostCenterRequest request
  ) {
    return accountingSettingsService.createCostCenter(principal.getUserId(), request);
  }

  @PatchMapping("/cost-centers/{id}")
  public CostCenterResponse updateCostCenter(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody CostCenterRequest request
  ) {
    return accountingSettingsService.updateCostCenter(principal.getUserId(), id, request);
  }

  @DeleteMapping("/cost-centers/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void archiveCostCenter(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    accountingSettingsService.archiveCostCenter(principal.getUserId(), id);
  }
}
