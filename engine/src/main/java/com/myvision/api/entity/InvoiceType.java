package com.myvision.api.entity;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

/**
 * Uppercase constants (unlike the other enums) because the database label
 * 'final' is a reserved Java keyword. Mapping to the lowercase PostgreSQL
 * labels is handled by {@link com.myvision.api.util.LowercaseLabelEnumJdbcType}.
 */
public enum InvoiceType {
  STANDARD,
  DEPOSIT,
  PROGRESS,
  FINAL,
  CREDIT_NOTE
}
