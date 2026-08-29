package com.myvision.api.controller;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.util.CurrentUserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard")
@Tag(name = "Dashboard", description = "Aggregated metrics for the current company")
public class DashboardController {

  private final DashboardService dashboardService;

  public DashboardController(DashboardService dashboardService) {
    this.dashboardService = dashboardService;
  }

  @GetMapping("/summary")
  public DashboardSummaryResponse summary(
      @AuthenticationPrincipal CurrentUserPrincipal principal
  ) {
    return dashboardService.summary(principal.getUserId());
  }

  /**
   * Everything the overview screen shows, in one response.
   *
   * <p>{@code revenueMonths} sizes the chart; {@code breakdownMonths} sizes the customer and
   * line-description rankings, which the screen lets the operator change independently.
   */
  @GetMapping("/overview")
  @Operation(summary = "Revenue, receivables, VAT, rankings and counts for the overview screen")
  public DashboardOverviewResponse overview(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @RequestParam(required = false) Integer revenueMonths,
      @RequestParam(required = false) Integer breakdownMonths
  ) {
    return dashboardService.overview(principal.getUserId(), revenueMonths, breakdownMonths);
  }

  @GetMapping("/activity")
  @Operation(summary = "The company's audit trail, newest first")
  public DashboardActivityResponse activity(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @RequestParam(required = false) Integer page,
      @RequestParam(required = false) Integer size
  ) {
    return dashboardService.activity(principal.getUserId(), page, size);
  }
}
