package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;

/**
 * What is still owed, split the way an operator chases it.
 *
 * <p>The three buckets are mutually exclusive and sum to {@code total}: an invoice is either past
 * its due date, not yet due, or part-settled. Overlapping buckets would let the same money be
 * counted twice on the same card.
 */
public record DashboardReceivablesResponse(
    BigDecimal total,
    Bucket overdue,
    Bucket open,
    Bucket partiallyPaid
) {

  /** An amount and how many invoices make it up. */
  public record Bucket(BigDecimal amount, long count) {
  }
}
