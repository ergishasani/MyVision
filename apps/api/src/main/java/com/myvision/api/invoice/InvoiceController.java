package com.myvision.api.invoice;

import com.myvision.api.auth.CurrentUserPrincipal;
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
@RequestMapping("/api/invoices")
@Tag(name = "Invoices", description = "Invoices with line items, balance tracking and status actions")
public class InvoiceController {

  private final InvoiceService invoiceService;

  public InvoiceController(InvoiceService invoiceService) {
    this.invoiceService = invoiceService;
  }

  @GetMapping
  public List<InvoiceResponse> list(@AuthenticationPrincipal CurrentUserPrincipal principal) {
    return invoiceService.list(principal.getUserId());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public InvoiceResponse create(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @Valid @RequestBody InvoiceRequest request
  ) {
    return invoiceService.create(principal.getUserId(), request);
  }

  @GetMapping("/{id}")
  public InvoiceResponse get(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return invoiceService.get(principal.getUserId(), id);
  }

  @PatchMapping("/{id}")
  public InvoiceResponse update(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody InvoiceUpdateRequest request
  ) {
    return invoiceService.update(principal.getUserId(), id, request);
  }

  @PostMapping("/{id}/mark-sent")
  public InvoiceResponse markSent(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return invoiceService.markSent(principal.getUserId(), id);
  }

  @PostMapping("/{id}/mark-paid")
  public InvoiceResponse markPaid(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return invoiceService.markPaid(principal.getUserId(), id);
  }

  @PostMapping("/{id}/cancel")
  public InvoiceResponse cancel(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return invoiceService.cancel(principal.getUserId(), id);
  }
}
