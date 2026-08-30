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
import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Files carried alongside an invoice — a delivery note, a signed timesheet, a photo of the work.
 *
 * <p>Stored through the same {@link FileStorageService} the company logo uses, and recorded as
 * {@link Document} rows so they stay attached to the invoice rather than living loose in a bucket.
 *
 * <p>The type and size limits are enforced here rather than trusted to the browser: a file picker
 * accept list is a hint to the person choosing, not a constraint on what arrives.
 */
@RestController
@RequestMapping("/api/invoices/{invoiceId}/attachments")
@Tag(name = "Invoice attachments", description = "Files carried alongside an invoice")
public class InvoiceAttachmentController {

  /** What the editor offers, and therefore all this accepts. */
  private static final Set<String> ALLOWED_TYPES = Set.of(
      MediaType.APPLICATION_PDF_VALUE,
      MediaType.IMAGE_PNG_VALUE,
      MediaType.IMAGE_JPEG_VALUE
  );

  private static final long MAX_BYTES = 5_000_000;

  private final InvoiceService invoiceService;
  private final CompanyAccessService companyAccessService;
  private final FileStorageService fileStorageService;
  private final DocumentRepository documentRepository;

  public InvoiceAttachmentController(
      InvoiceService invoiceService,
      CompanyAccessService companyAccessService,
      FileStorageService fileStorageService,
      DocumentRepository documentRepository
  ) {
    this.invoiceService = invoiceService;
    this.companyAccessService = companyAccessService;
    this.fileStorageService = fileStorageService;
    this.documentRepository = documentRepository;
  }

  @GetMapping
  public List<DocumentResponseItem> list(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID invoiceId
  ) {
    UUID companyId = companyAccessService.currentCompanyId(principal.getUserId());
    invoiceService.requireInvoice(invoiceId, companyId);
    return documentRepository.findByInvoiceIdAndCompanyIdOrderByCreatedAtDesc(invoiceId, companyId)
        .stream()
        .map(DocumentResponseItem::from)
        .toList();
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @ResponseStatus(HttpStatus.CREATED)
  @Operation(summary = "Attach a PDF or image to an invoice")
  public DocumentResponseItem upload(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID invoiceId,
      @RequestPart("file") MultipartFile file
  ) throws IOException {
    UUID companyId = companyAccessService.currentCompanyId(principal.getUserId());
    invoiceService.requireInvoice(invoiceId, companyId);

    if (file.isEmpty()) {
      throw new BadRequestException("A file is required");
    }
    if (file.getSize() > MAX_BYTES) {
      throw new BadRequestException("Attachments must be smaller than 5 MB");
    }
    String contentType = file.getContentType() == null
        ? ""
        : file.getContentType().toLowerCase(Locale.ROOT);
    if (!ALLOWED_TYPES.contains(contentType)) {
      throw new BadRequestException("Only PDF, PNG and JPEG files can be attached");
    }

    // Namespaced by company and invoice so one tenant's storage path can never collide with
    // another's, and a stray listing of the bucket stays intelligible.
    String path = "companies/%s/invoices/%s/%s-%s".formatted(
        companyId, invoiceId, UUID.randomUUID(), safeName(file.getOriginalFilename()));
    // putPublic, not put: the private variant returns no URL at all, and `documents.file_url` is
    // not-null because a document nobody can open is not a document. This does mean the file is
    // served from an unauthenticated capability URL — unguessable, but not access-controlled.
    // That is the same trade-off the company logo already makes; it is worth revisiting before
    // production, because an attached delivery note carries customer data and a logo does not.
    StorageObject stored = fileStorageService.putPublic(path, contentType, file.getBytes());

    Document document = new Document();
    document.setCompanyId(companyId);
    document.setInvoiceId(invoiceId);
    document.setFileName(safeName(file.getOriginalFilename()));
    document.setFileUrl(stored.publicUrl());
    document.setMimeType(contentType);
    return DocumentResponseItem.from(documentRepository.save(document));
  }

  @DeleteMapping("/{documentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID invoiceId,
      @PathVariable UUID documentId
  ) {
    UUID companyId = companyAccessService.currentCompanyId(principal.getUserId());
    invoiceService.requireInvoice(invoiceId, companyId);
    Document document = documentRepository.findById(documentId)
        .filter(found -> companyId.equals(found.getCompanyId()))
        .filter(found -> invoiceId.equals(found.getInvoiceId()))
        .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
    documentRepository.delete(document);
  }

  /**
   * Strips any path the browser sent along with the name.
   *
   * <p>A filename arriving from a client is untrusted input; "../../etc/passwd" is a legal thing
   * for it to contain, and it must never reach a storage path.
   */
  private static String safeName(String original) {
    if (original == null || original.isBlank()) {
      return "attachment";
    }
    String base = original.replace("\\", "/");
    base = base.substring(base.lastIndexOf('/') + 1);
    base = base.replaceAll("[^A-Za-z0-9._-]", "_");
    return base.isBlank() ? "attachment" : base;
  }
}
