package com.myvision.api.controller;

import com.myvision.api.dto.DocumentResponseItem;
import com.myvision.api.dto.PaymentListItemResponse;
import com.myvision.api.service.CompanyLedgerService;
import com.myvision.api.util.CurrentUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Company-wide lists that do not hang off a single parent record.
 *
 * <p>{@code /api/invoices/{id}/payments} answers "what was paid against this invoice"; these
 * answer "what happened across the company", which is what the payments and documents screens
 * need.
 */
@RestController
@Tag(name = "Ledger", description = "Company-wide payment and document listings")
public class LedgerController {

  private final CompanyLedgerService companyLedgerService;

  public LedgerController(CompanyLedgerService companyLedgerService) {
    this.companyLedgerService = companyLedgerService;
  }

  @GetMapping("/api/payments")
  @Operation(summary = "All payments recorded for the company, newest first")
  public List<PaymentListItemResponse> payments(
      @AuthenticationPrincipal CurrentUserPrincipal principal
  ) {
    return companyLedgerService.payments(principal.getUserId());
  }

  @GetMapping("/api/documents")
  @Operation(summary = "Generated documents stored for the company, newest first")
  public List<DocumentResponseItem> documents(
      @AuthenticationPrincipal CurrentUserPrincipal principal
  ) {
    return companyLedgerService.documents(principal.getUserId());
  }
}
