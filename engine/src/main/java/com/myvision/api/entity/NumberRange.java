package com.myvision.api.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.util.UUID;
import org.hibernate.annotations.JdbcType;
import org.hibernate.dialect.PostgreSQLEnumJdbcType;

/**
 * One numbering counter, e.g. "invoices are RE-%NUMBER starting at 1133".
 *
 * <p>The counter only ever moves forward. Rewinding it would hand out an invoice number that has
 * already been issued, which §14 UStG does not allow and which the unique index on
 * {@code invoices(company_id, invoice_number)} would reject anyway.
 */
@Entity
@Table(name = "number_ranges")
public class NumberRange extends BaseEntity {

  @Column(name = "company_id", nullable = false, updatable = false)
  private UUID companyId;

  @Enumerated(EnumType.STRING)
  @JdbcType(PostgreSQLEnumJdbcType.class)
  @Column(nullable = false, columnDefinition = "number_range_type")
  private NumberRangeType type;

  /** A template containing the literal {@code %NUMBER}. */
  @Column(nullable = false)
  private String format = "%NUMBER";

  /** Digits to zero-pad to. 4 renders 7 as 0007. */
  @Column(nullable = false)
  private Integer padding = 0;

  @Column(name = "next_number", nullable = false)
  private Integer nextNumber = 1;

  /**
   * Renders the given number through this range's format.
   *
   * <p>Locale.ROOT because a document number is an identifier, not a quantity: under a German
   * locale the default formatter would happily group the digits.
   */
  public String render(int number) {
    return render(format, padding, number);
  }

  /** The same rendering, for callers holding a format and padding without a stored row. */
  public static String render(String format, Integer padding, int number) {
    int width = padding != null ? padding : 0;
    String digits = width > 0
        ? String.format(java.util.Locale.ROOT, "%0" + width + "d", number)
        : String.valueOf(number);
    return format.replace("%NUMBER", digits);
  }

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public NumberRangeType getType() {
    return type;
  }

  public void setType(NumberRangeType type) {
    this.type = type;
  }

  public String getFormat() {
    return format;
  }

  public void setFormat(String format) {
    this.format = format;
  }

  public Integer getPadding() {
    return padding;
  }

  public void setPadding(Integer padding) {
    this.padding = padding;
  }

  public Integer getNextNumber() {
    return nextNumber;
  }

  public void setNextNumber(Integer nextNumber) {
    this.nextNumber = nextNumber;
  }
}
