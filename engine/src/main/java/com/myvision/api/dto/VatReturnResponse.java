package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * A German VAT advance return (Umsatzsteuer-Voranmeldung), laid out as the form itself.
 *
 * <p>Engineering output, not tax advice. It reports what this system recorded and, just as
 * importantly, what it could not: MyVision holds sales, not purchases, so there is no input tax
 * to deduct. That makes {@code payable} — the Zahllast, Kz 83 — genuinely uncomputable rather
 * than zero, and it is returned null so no screen can print a filing figure with no basis behind
 * it.
 *
 * <p>The statutory line descriptions are kept in German verbatim. They are citations of the law
 * the box refers to, and translating "Innergemeinschaftliche Lieferungen (Sec. 4 Nr. 1 Buchst. b
 * UStG)" into looser English would make the reference harder to check, not easier. Group headings
 * are English, which is the same split the form's own software uses.
 */
public record VatReturnResponse(
    LocalDate from,
    LocalDate to,
    String currency,
    List<Group> groups,

    /** Output tax this system can account for. Not the amount owed — see {@code payable}. */
    BigDecimal outputTaxTotal,

    /** Always false today. Purchases and receipts are not part of this system. */
    boolean inputTaxAvailable,

    /**
     * The Zahllast. Null whenever input tax is unavailable, because output tax alone is one side
     * of a subtraction and printing it as the amount due would be wrong.
     */
    BigDecimal payable,

    int invoiceCount
) {

  /**
   * One block of the form, collapsible on screen.
   *
   * <p>{@code derived} says whether this system can source the block at all. False means every
   * line under it is unknown rather than nil — a business with intra-community acquisitions would
   * see nothing here and has to be told why.
   */
  public record Group(
      String label,
      boolean derived,
      BigDecimal basis,
      BigDecimal tax,
      List<Line> lines
  ) {
  }

  /**
   * One numbered line.
   *
   * <p>The form has two Kennziffer columns: one for the basis of assessment and one for the tax.
   * Most lines use only one of them — Kz 81 has a basis box but no tax box, because the tax is
   * derived from the rate; input-tax lines are the reverse. A null code means the form has no box
   * there, and a null amount means this system has nothing to put in it.
   */
  public record Line(
      String basisCode,
      String taxCode,
      String label,
      BigDecimal basis,
      BigDecimal tax,
      boolean available
  ) {
  }
}
