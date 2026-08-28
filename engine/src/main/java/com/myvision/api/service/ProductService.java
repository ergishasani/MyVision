package com.myvision.api.service;

import com.myvision.api.dto.ProductRequest;
import com.myvision.api.dto.ProductResponse;
import com.myvision.api.dto.ProductUnitInput;
import com.myvision.api.dto.ProductUnitResponse;
import com.myvision.api.dto.ProductUpdateRequest;
import com.myvision.api.entity.Product;
import com.myvision.api.entity.NumberRangeType;
import com.myvision.api.entity.ProductCategory;
import com.myvision.api.entity.ProductUnit;
import com.myvision.api.entity.ProductUnitCode;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.exception.ResourceNotFoundException;
import com.myvision.api.repository.ProductRepository;
import com.myvision.api.repository.ProductUnitRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductService {

  private final ProductRepository productRepository;
  private final ProductUnitRepository productUnitRepository;
  private final CompanyAccessService companyAccessService;
  private final NumberRangeService numberRangeService;

  public ProductService(
      ProductRepository productRepository,
      ProductUnitRepository productUnitRepository,
      CompanyAccessService companyAccessService,
      NumberRangeService numberRangeService
  ) {
    this.productRepository = productRepository;
    this.productUnitRepository = productUnitRepository;
    this.companyAccessService = companyAccessService;
    this.numberRangeService = numberRangeService;
  }

  @Transactional(readOnly = true)
  public List<ProductResponse> list(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return productRepository.findByCompanyIdAndArchivedAtIsNullOrderByCreatedAtDesc(companyId)
        .stream()
        .map(product -> ProductResponse.from(product, unitsFor(product)))
        .toList();
  }

  @Transactional(readOnly = true)
  public ProductResponse get(UUID userId, UUID productId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Product product = requireProduct(productId, companyId);
    return ProductResponse.from(product, unitsFor(product));
  }

  @Transactional
  public ProductResponse create(UUID userId, ProductRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);

    Product product = new Product();
    product.setCompanyId(companyId);
    product.setName(request.name().trim());
    product.setCategory(request.category() != null ? request.category() : ProductCategory.article);
    product.setUnit(request.unit() != null ? request.unit() : ProductUnitCode.pcs);
    product.setTaxRate(request.taxRate() != null ? request.taxRate() : new BigDecimal("19.00"));
    product.setSellingPriceNet(resolveNet(
        request.sellingPriceNet(), request.sellingPriceGross(), product.getTaxRate(),
        BigDecimal.ZERO));
    product.setPurchasePriceNet(resolveNet(
        request.purchasePriceNet(), request.purchasePriceGross(), product.getTaxRate(), null));
    product.setDescription(request.description());
    product.setInternalNote(request.internalNote());
    product.setInventoryEnabled(Boolean.TRUE.equals(request.inventoryEnabled()));
    product.setArticleNumber(assignArticleNumber(companyId, request.articleNumber()));

    Product saved = productRepository.save(product);
    List<ProductUnitResponse> units = replaceUnits(saved, request.units());
    return ProductResponse.from(saved, units);
  }

  @Transactional
  public ProductResponse update(UUID userId, UUID productId, ProductUpdateRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Product product = requireProduct(productId, companyId);

    if (request.name() != null) {
      product.setName(request.name().trim());
    }
    if (request.category() != null) {
      product.setCategory(request.category());
    }
    if (request.unit() != null) {
      product.setUnit(request.unit());
    }
    // Applied before the prices, so a gross figure sent alongside a new rate converts using the
    // rate the caller meant rather than the old one.
    if (request.taxRate() != null) {
      product.setTaxRate(request.taxRate());
    }
    if (request.sellingPriceNet() != null || request.sellingPriceGross() != null) {
      product.setSellingPriceNet(resolveNet(
          request.sellingPriceNet(), request.sellingPriceGross(), product.getTaxRate(),
          product.getSellingPriceNet()));
    }
    if (request.purchasePriceNet() != null || request.purchasePriceGross() != null) {
      product.setPurchasePriceNet(resolveNet(
          request.purchasePriceNet(), request.purchasePriceGross(), product.getTaxRate(),
          product.getPurchasePriceNet()));
    }
    if (request.description() != null) {
      product.setDescription(request.description());
    }
    if (request.internalNote() != null) {
      product.setInternalNote(request.internalNote());
    }
    if (request.inventoryEnabled() != null) {
      product.setInventoryEnabled(request.inventoryEnabled());
    }
    if (request.articleNumber() != null
        && !request.articleNumber().equals(product.getArticleNumber())) {
      requireNumberFree(companyId, request.articleNumber());
      product.setArticleNumber(request.articleNumber());
    }

    Product saved = productRepository.save(product);
    // An absent list means "leave the units alone"; an empty one means "remove them all".
    List<ProductUnitResponse> units = request.units() != null
        ? replaceUnits(saved, request.units())
        : unitsFor(saved);
    return ProductResponse.from(saved, units);
  }

  @Transactional
  public void archive(UUID userId, UUID productId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Product product = requireProduct(productId, companyId);
    if (product.getArchivedAt() == null) {
      product.setArchivedAt(OffsetDateTime.now());
      productRepository.save(product);
    }
  }

  @Transactional(readOnly = true)
  public int peekNextArticleNumber(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return numberRangeService.peek(companyId, NumberRangeType.product);
  }

  /**
   * Works out the net price to store from whichever figure the caller supplied.
   *
   * <p>Net wins when both are present: it is the column that exists, so preferring it means what
   * is stored is what was sent. A gross-only figure is divided back out by the tax rate.
   */
  static BigDecimal resolveNet(
      BigDecimal net, BigDecimal gross, BigDecimal taxRate, BigDecimal fallback) {
    if (net != null) {
      return net.setScale(2, RoundingMode.HALF_UP);
    }
    if (gross == null) {
      return fallback;
    }
    BigDecimal rate = taxRate != null ? taxRate : BigDecimal.ZERO;
    BigDecimal divisor = BigDecimal.ONE.add(rate.movePointLeft(2));
    // A -100% rate would divide by zero. The column range check forbids it; arithmetic does not.
    if (divisor.signum() == 0) {
      return gross.setScale(2, RoundingMode.HALF_UP);
    }
    return gross.divide(divisor, 2, RoundingMode.HALF_UP);
  }

  private List<ProductUnitResponse> unitsFor(Product product) {
    return productUnitRepository.findByProductIdOrderByPositionAsc(product.getId())
        .stream()
        .map(unit -> ProductUnitResponse.from(unit, product.getSellingPriceNet()))
        .toList();
  }

  /**
   * Replaces a product's alternative units with the supplied set.
   *
   * <p>The delete is flushed before the inserts. Without it Hibernate is free to order the bulk
   * delete after the inserts and wipe the rows just written.
   */
  private List<ProductUnitResponse> replaceUnits(Product product, List<ProductUnitInput> inputs) {
    productUnitRepository.deleteByProductId(product.getId());
    productUnitRepository.flush();

    if (inputs == null || inputs.isEmpty()) {
      return List.of();
    }

    List<ProductUnit> rows = new ArrayList<>();
    int position = 0;
    for (ProductUnitInput input : inputs) {
      if (input == null || input.unit() == null || input.factor() == null) {
        continue;
      }
      ProductUnit row = new ProductUnit();
      row.setProductId(product.getId());
      row.setCompanyId(product.getCompanyId());
      row.setUnit(input.unit());
      row.setFactor(input.factor());
      row.setPosition(position++);
      rows.add(row);
    }

    return productUnitRepository.saveAll(rows)
        .stream()
        .map(unit -> ProductUnitResponse.from(unit, product.getSellingPriceNet()))
        .toList();
  }

  private Integer assignArticleNumber(UUID companyId, Integer requested) {
    if (requested != null) {
      requireNumberFree(companyId, requested);
      // Push the counter past an explicitly chosen number so it is not handed out again later.
      numberRangeService.observeUsed(companyId, NumberRangeType.product, requested);
      return requested;
    }
    return numberRangeService.allocateNumber(companyId, NumberRangeType.product);
  }

  private void requireNumberFree(UUID companyId, Integer number) {
    if (productRepository.existsByCompanyIdAndArticleNumber(companyId, number)) {
      throw new BadRequestException("Article number " + number + " is already in use");
    }
  }

  private Product requireProduct(UUID productId, UUID companyId) {
    return productRepository.findByIdAndCompanyId(productId, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
  }
}
