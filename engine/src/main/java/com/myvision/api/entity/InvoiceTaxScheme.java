package com.myvision.api.entity;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

/**
 * Which VAT treatment an invoice falls under.
 *
 * <p>Not cosmetic: each one obliges the document to say something different. A reverse-charge
 * invoice has to carry the note that the recipient owes the tax, an exempt one has to cite the
 * provision it is exempt under, and neither may show a VAT amount.
 */
public enum InvoiceTaxScheme {
  /** Standard domestic supply. VAT charged at the line rates. */
  domestic_taxable,

  /** Exempt under Sec. 4 UStG. No VAT, and the document must say which provision applies. */
  domestic_exempt,

  /** Sec. 13b UStG: the recipient owes the tax. No VAT shown, note required. */
  reverse_charge_13b,

  /** Intra-community supply to a VAT-registered business. No VAT, both VAT IDs required. */
  eu_b2b,

  /** Export outside the EU. No VAT. */
  export_non_eu
}
