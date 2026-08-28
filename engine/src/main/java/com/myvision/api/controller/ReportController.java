package com.myvision.api.controller;

import com.myvision.api.dto.VatReportResponse;
import com.myvision.api.service.VatReportService;
import com.myvision.api.util.CurrentUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Reports", description = "Aggregates computed from invoice data")
public class ReportController {

  private final VatReportService vatReportService;

  public ReportController(VatReportService vatReportService) {
    this.vatReportService = vatReportService;
  }

  /**
   * VAT invoiced across a period, split by rate.
   *
   * <p>Engineering output, not tax advice: it reports what the system recorded, and the figures
   * still need review against the compliance checklist before they inform a filing.
   */
  @GetMapping("/vat")
  @Operation(summary = "VAT invoiced over a period, broken down by rate")
  public VatReportResponse vat(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
  ) {
    return vatReportService.report(principal.getUserId(), from, to);
  }
}
