package com.myvision.api.controller;

import com.myvision.api.dto.ProductRequest;
import com.myvision.api.dto.ProductResponse;
import com.myvision.api.dto.ProductUpdateRequest;
import com.myvision.api.service.ProductService;
import com.myvision.api.util.CurrentUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
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
@RequestMapping("/api/products")
@Tag(name = "Products", description = "Product catalogue. DELETE archives instead of removing.")
public class ProductController {

  private final ProductService productService;

  public ProductController(ProductService productService) {
    this.productService = productService;
  }

  @GetMapping
  public List<ProductResponse> list(@AuthenticationPrincipal CurrentUserPrincipal principal) {
    return productService.list(principal.getUserId());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ProductResponse create(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @Valid @RequestBody ProductRequest request
  ) {
    return productService.create(principal.getUserId(), request);
  }

  /**
   * The number the next product would receive, so the create form can show it before saving.
   *
   * <p>A preview only. The number is allocated server-side on create, so two people opening the
   * form at once still get different numbers.
   */
  @GetMapping("/next-number")
  @Operation(summary = "Preview the next article number")
  public Map<String, Integer> nextNumber(@AuthenticationPrincipal CurrentUserPrincipal principal) {
    return Map.of("nextArticleNumber", productService.peekNextArticleNumber(principal.getUserId()));
  }

  @GetMapping("/{id}")
  public ProductResponse get(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return productService.get(principal.getUserId(), id);
  }

  @PatchMapping("/{id}")
  public ProductResponse update(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody ProductUpdateRequest request
  ) {
    return productService.update(principal.getUserId(), id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void archive(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    productService.archive(principal.getUserId(), id);
  }
}
