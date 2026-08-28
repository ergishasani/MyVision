package com.myvision.api.controller;

import com.myvision.api.dto.LogoUploadResponse;
import com.myvision.api.dto.StorageObject;
import com.myvision.api.entity.Company;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.exception.ResourceNotFoundException;
import com.myvision.api.repository.CompanyRepository;
import com.myvision.api.service.CompanyAccessService;
import com.myvision.api.service.FileStorageService;
import com.myvision.api.util.CurrentUserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/company")
@Tag(name = "Company", description = "Company profile assets and settings")
public class CompanyController {

  private static final Set<String> ALLOWED_LOGO_TYPES = Set.of(
      MediaType.IMAGE_PNG_VALUE,
      MediaType.IMAGE_JPEG_VALUE,
      "image/webp",
      "image/svg+xml"
  );

  private final CompanyAccessService companyAccessService;
  private final CompanyRepository companyRepository;
  private final FileStorageService fileStorageService;

  public CompanyController(
      CompanyAccessService companyAccessService,
      CompanyRepository companyRepository,
      FileStorageService fileStorageService
  ) {
    this.companyAccessService = companyAccessService;
    this.companyRepository = companyRepository;
    this.fileStorageService = fileStorageService;
  }

  @PostMapping(value = "/logo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public LogoUploadResponse uploadLogo(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @RequestPart("file") MultipartFile file
  ) throws IOException {
    if (file.isEmpty()) {
      throw new BadRequestException("Logo file is required");
    }
    if (file.getSize() > 2_000_000) {
      throw new BadRequestException("Logo file must be smaller than 2 MB");
    }
    String contentType = file.getContentType() == null ? "" : file.getContentType();
    if (!ALLOWED_LOGO_TYPES.contains(contentType)) {
      throw new BadRequestException("Logo must be PNG, JPEG, WEBP or SVG");
    }

    UUID companyId = companyAccessService.currentCompanyId(principal.getUserId());
    String extension = extensionFor(contentType);
    StorageObject stored = fileStorageService.putPublic(
        "companies/%s/logo.%s".formatted(companyId, extension),
        contentType,
        file.getBytes());

    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Company not found"));
    company.setLogoUrl(stored.publicUrl());
    companyRepository.save(company);
    return new LogoUploadResponse(stored.publicUrl(), stored.path());
  }

  private String extensionFor(String contentType) {
    return switch (contentType) {
      case MediaType.IMAGE_JPEG_VALUE -> "jpg";
      case "image/webp" -> "webp";
      case "image/svg+xml" -> "svg";
      default -> "png";
    };
  }
}
