package com.myvision.api.service;

import com.myvision.api.dto.BookingAccountRequest;
import com.myvision.api.dto.BookingAccountResponse;
import com.myvision.api.dto.CostCenterRequest;
import com.myvision.api.dto.CostCenterResponse;
import com.myvision.api.entity.BookingAccount;
import com.myvision.api.entity.CostCenter;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.exception.ResourceNotFoundException;
import com.myvision.api.repository.BookingAccountRepository;
import com.myvision.api.repository.CostCenterRepository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * The chart of accounts and cost centres a company keeps.
 *
 * <p>Both are reference data that documents point at, so neither is ever hard-deleted — archiving
 * hides it from the pickers while leaving history that already refers to it intact.
 */
@Service
public class AccountingSettingsService {

  private final BookingAccountRepository bookingAccountRepository;
  private final CostCenterRepository costCenterRepository;
  private final CompanyAccessService companyAccessService;

  public AccountingSettingsService(
      BookingAccountRepository bookingAccountRepository,
      CostCenterRepository costCenterRepository,
      CompanyAccessService companyAccessService
  ) {
    this.bookingAccountRepository = bookingAccountRepository;
    this.costCenterRepository = costCenterRepository;
    this.companyAccessService = companyAccessService;
  }

  // --- booking accounts ----------------------------------------------------

  @Transactional(readOnly = true)
  public List<BookingAccountResponse> listBookingAccounts(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return bookingAccountRepository.findByCompanyIdAndArchivedAtIsNullOrderByDisplayNameAsc(companyId)
        .stream()
        .map(BookingAccountResponse::from)
        .toList();
  }

  @Transactional
  public BookingAccountResponse createBookingAccount(UUID userId, BookingAccountRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    BookingAccount account = new BookingAccount();
    account.setCompanyId(companyId);
    apply(account, request);
    return BookingAccountResponse.from(bookingAccountRepository.save(account));
  }

  @Transactional
  public BookingAccountResponse updateBookingAccount(
      UUID userId, UUID id, BookingAccountRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    BookingAccount account = bookingAccountRepository.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Booking account not found"));
    apply(account, request);
    return BookingAccountResponse.from(bookingAccountRepository.save(account));
  }

  @Transactional
  public void archiveBookingAccount(UUID userId, UUID id) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    BookingAccount account = bookingAccountRepository.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Booking account not found"));
    if (account.getArchivedAt() == null) {
      account.setArchivedAt(OffsetDateTime.now());
      bookingAccountRepository.save(account);
    }
  }

  private void apply(BookingAccount account, BookingAccountRequest request) {
    if (request.displayName() != null) {
      account.setDisplayName(request.displayName().trim());
    }
    if (request.name() != null) {
      account.setName(request.name().trim());
    }
    if (request.skrAccount() != null) {
      account.setSkrAccount(request.skrAccount().trim());
    }
    if (account.getDisplayName() == null || account.getDisplayName().isBlank()) {
      throw new BadRequestException("A display name is required");
    }
  }

  // --- cost centres --------------------------------------------------------

  @Transactional(readOnly = true)
  public List<CostCenterResponse> listCostCenters(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return costCenterRepository.findByCompanyIdAndArchivedAtIsNullOrderByNameAsc(companyId)
        .stream()
        .map(CostCenterResponse::from)
        .toList();
  }

  @Transactional
  public CostCenterResponse createCostCenter(UUID userId, CostCenterRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    CostCenter center = new CostCenter();
    center.setCompanyId(companyId);
    applyCostCenter(companyId, center, request);
    return CostCenterResponse.from(costCenterRepository.save(center));
  }

  @Transactional
  public CostCenterResponse updateCostCenter(UUID userId, UUID id, CostCenterRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    CostCenter center = costCenterRepository.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Cost centre not found"));
    applyCostCenter(companyId, center, request);
    return CostCenterResponse.from(costCenterRepository.save(center));
  }

  @Transactional
  public void archiveCostCenter(UUID userId, UUID id) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    CostCenter center = costCenterRepository.findByIdAndCompanyId(id, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Cost centre not found"));
    if (center.getArchivedAt() == null) {
      center.setArchivedAt(OffsetDateTime.now());
      costCenterRepository.save(center);
    }
  }

  private void applyCostCenter(UUID companyId, CostCenter center, CostCenterRequest request) {
    if (request.name() != null) {
      center.setName(request.name().trim());
    }
    if (request.number() != null) {
      String number = request.number().trim();
      // Blank means "no number", not an empty string competing for the uniqueness slot.
      if (number.isEmpty()) {
        center.setNumber(null);
      } else {
        if (!number.equals(center.getNumber())
            && costCenterRepository.existsByCompanyIdAndNumber(companyId, number)) {
          throw new BadRequestException("Cost centre number " + number + " is already in use");
        }
        center.setNumber(number);
      }
    }
    if (center.getName() == null || center.getName().isBlank()) {
      throw new BadRequestException("A name is required");
    }
  }
}
