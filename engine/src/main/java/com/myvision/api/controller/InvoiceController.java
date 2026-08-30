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
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import io.swagger.v3.oas.annotations.Operation;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/invoices")
@Tag(name = "Invoices", description = "Invoices with line items, balance tracking and status actions")
public class InvoiceController {

  private final InvoiceService invoiceService;
  private final InvoiceDocumentService invoiceDocumentService;

  public InvoiceController(InvoiceService invoiceService, InvoiceDocumentService invoiceDocumentService) {
    this.invoiceService = invoiceService;
    this.invoiceDocumentService = invoiceDocumentService;
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

  @PutMapping("/{id}/tags")
  @Operation(summary = "Replace an invoice's filing tags")
  public InvoiceResponse replaceTags(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody InvoiceTagsRequest request
  ) {
    return invoiceService.replaceTags(principal.getUserId(), id, request.tags());
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

  @GetMapping("/{id}/pdf")
  public ResponseEntity<byte[]> pdf(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    InvoiceResponse invoice = invoiceService.get(principal.getUserId(), id);
    byte[] pdf = invoiceDocumentService.pdf(principal.getUserId(), id);
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .header(HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.inline().filename(invoice.invoiceNumber() + ".pdf").build().toString())
        .body(pdf);
  }

  @PostMapping("/{id}/pdf")
  public DocumentResponse storePdf(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return invoiceDocumentService.storePdf(principal.getUserId(), id);
  }

  @GetMapping("/{id}/xrechnung")
  public ResponseEntity<byte[]> xrechnung(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    InvoiceResponse invoice = invoiceService.get(principal.getUserId(), id);
    byte[] xml = invoiceDocumentService.xrechnungXml(principal.getUserId(), id);
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_XML)
        .header(HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment()
                .filename(invoice.invoiceNumber() + "-xrechnung.xml")
                .build()
                .toString())
        .body(xml);
  }

  @PostMapping("/{id}/xrechnung")
  public DocumentResponse storeXrechnung(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return invoiceDocumentService.storeXrechnungXml(principal.getUserId(), id);
  }

  @GetMapping("/{id}/zugferd")
  public ResponseEntity<byte[]> zugferd(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return ResponseEntity.ok()
        .contentType(MediaType.APPLICATION_PDF)
        .body(invoiceDocumentService.zugferdPdf(principal.getUserId(), id));
  }
}
