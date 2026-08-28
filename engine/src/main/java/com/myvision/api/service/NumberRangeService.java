package com.myvision.api.service;

import com.myvision.api.dto.NumberRangeResponse;
import com.myvision.api.dto.NumberRangeUpdateRequest;
import com.myvision.api.entity.NumberRange;
import com.myvision.api.entity.NumberRangeType;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.repository.NumberRangeRepository;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Hands out document and record numbers.
 *
 * <p>Every counter in the product goes through here, so there is one place where "what number
 * comes next" is decided. Allocation takes a row lock, which is what stops two documents created
 * at the same moment from being given the same number.
 */
@Service
public class NumberRangeService {

  /** What a company starts with. Used when a range has never been touched. */
  private static final Map<NumberRangeType, Defaults> DEFAULTS = defaults();

  private record Defaults(String format, int padding, int nextNumber) {
  }

  private static Map<NumberRangeType, Defaults> defaults() {
    Map<NumberRangeType, Defaults> map = new EnumMap<>(NumberRangeType.class);
    map.put(NumberRangeType.invoice, new Defaults("INV-%NUMBER", 4, 1));
    map.put(NumberRangeType.quote, new Defaults("Q-%NUMBER", 4, 1));
    // German document abbreviations: Gutschrift, Auftragsbestätigung, Lieferschein.
    map.put(NumberRangeType.credit_note, new Defaults("GU-%NUMBER", 4, 1));
    map.put(NumberRangeType.order_confirmation, new Defaults("AB-%NUMBER", 4, 1));
    map.put(NumberRangeType.delivery_note, new Defaults("LI-%NUMBER", 4, 1));
    // Bare counters. 1000 so the first ones read as account references rather than "1".
    map.put(NumberRangeType.contact, new Defaults("%NUMBER", 0, 1000));
    map.put(NumberRangeType.product, new Defaults("%NUMBER", 0, 1000));
    // SKR convention puts customers at 10000 and suppliers at 70000.
    map.put(NumberRangeType.debtor, new Defaults("%NUMBER", 0, 10000));
    map.put(NumberRangeType.creditor, new Defaults("%NUMBER", 0, 70000));
    return map;
  }

  private final NumberRangeRepository numberRangeRepository;
  private final CompanyAccessService companyAccessService;

  public NumberRangeService(
      NumberRangeRepository numberRangeRepository,
      CompanyAccessService companyAccessService
  ) {
    this.numberRangeRepository = numberRangeRepository;
    this.companyAccessService = companyAccessService;
  }

  @Transactional(readOnly = true)
  public List<NumberRangeResponse> list(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Map<NumberRangeType, NumberRange> stored = new EnumMap<>(NumberRangeType.class);
    for (NumberRange range : numberRangeRepository.findByCompanyId(companyId)) {
      stored.put(range.getType(), range);
    }

    // Every type is listed whether or not a row exists yet, so the settings screen shows the
    // complete set rather than only the counters that happen to have been used.
    return java.util.Arrays.stream(NumberRangeType.values())
        .map(type -> {
          NumberRange range = stored.get(type);
          if (range != null) {
            return NumberRangeResponse.from(range);
          }
          Defaults fallback = DEFAULTS.get(type);
          return new NumberRangeResponse(
              null, type.name(), fallback.format(), fallback.padding(), fallback.nextNumber(),
              NumberRange.render(fallback.format(), fallback.padding(), fallback.nextNumber()));
        })
        .toList();
  }

  /**
   * Allocates the next number and advances the counter.
   *
   * <p>Returns the rendered string, e.g. {@code RE-1133}.
   */
  @Transactional
  public String allocate(UUID companyId, NumberRangeType type) {
    NumberRange range = lockOrCreate(companyId, type);
    int number = range.getNextNumber();
    range.setNextNumber(number + 1);
    numberRangeRepository.save(range);
    return range.render(number);
  }

  /** Allocates the next number where the caller stores the bare integer rather than the format. */
  @Transactional
  public int allocateNumber(UUID companyId, NumberRangeType type) {
    NumberRange range = lockOrCreate(companyId, type);
    int number = range.getNextNumber();
    range.setNextNumber(number + 1);
    numberRangeRepository.save(range);
    return number;
  }

  /**
   * Records that a number was taken explicitly rather than allocated, so the counter does not
   * later hand out the same one.
   */
  @Transactional
  public void observeUsed(UUID companyId, NumberRangeType type, int used) {
    NumberRange range = lockOrCreate(companyId, type);
    if (used >= range.getNextNumber()) {
      range.setNextNumber(used + 1);
      numberRangeRepository.save(range);
    }
  }

  /** What the next document would be numbered, without consuming it. */
  @Transactional(readOnly = true)
  public int peek(UUID companyId, NumberRangeType type) {
    return numberRangeRepository.findByCompanyIdAndType(companyId, type)
        .map(NumberRange::getNextNumber)
        .orElseGet(() -> DEFAULTS.get(type).nextNumber());
  }

  /**
   * Edits a range.
   *
   * <p>The counter may be moved forward but never back. Rewinding it would reissue a number that
   * is already on a document a customer holds, which §14 UStG does not allow. Moving it forward is
   * the legitimate case: a business migrating from another system continues where that one left
   * off.
   */
  @Transactional
  public NumberRangeResponse update(UUID userId, NumberRangeType type, NumberRangeUpdateRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    NumberRange range = lockOrCreate(companyId, type);

    if (request.format() != null) {
      String format = request.format().trim();
      if (!format.contains("%NUMBER")) {
        throw new BadRequestException("The format must contain %NUMBER");
      }
      range.setFormat(format);
    }
    if (request.padding() != null) {
      if (request.padding() < 0 || request.padding() > 12) {
        throw new BadRequestException("Padding must be between 0 and 12 digits");
      }
      range.setPadding(request.padding());
    }
    if (request.nextNumber() != null) {
      if (request.nextNumber() < range.getNextNumber()) {
        throw new BadRequestException(
            "The next number can only be moved forward. It is currently " + range.getNextNumber()
                + "; going back would reissue a number already in use.");
      }
      range.setNextNumber(request.nextNumber());
    }

    return NumberRangeResponse.from(numberRangeRepository.save(range));
  }

  /**
   * Takes a row lock on the counter, creating it from the defaults if this company has never used
   * it. The lock is what makes concurrent document creation safe.
   */
  private NumberRange lockOrCreate(UUID companyId, NumberRangeType type) {
    return numberRangeRepository.findByCompanyIdAndTypeForUpdate(companyId, type)
        .orElseGet(() -> {
          Defaults fallback = DEFAULTS.get(type);
          NumberRange range = new NumberRange();
          range.setCompanyId(companyId);
          range.setType(type);
          range.setFormat(fallback.format());
          range.setPadding(fallback.padding());
          range.setNextNumber(fallback.nextNumber());
          return numberRangeRepository.saveAndFlush(range);
        });
  }
}
