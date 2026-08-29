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

/**
 * What one contact is worth and what they still owe.
 *
 * <p>Every money figure is in {@code currency} and covers only the documents issued in it. A
 * contact billed in two currencies would otherwise get a total that is the sum of unlike things,
 * and a wrong number on a billing screen is worse than a missing one. {@code excludedCurrencies}
 * names anything left out so the screen can say so rather than quietly under-reporting.
 *
 * <p>Drafts and cancelled invoices are excluded from {@code totalInvoiced}: a draft has not been
 * issued and a cancelled invoice is not revenue.
 */
public record ClientStatsResponse(
    String currency,
    java.util.List<String> excludedCurrencies,
    BigDecimal totalInvoiced,
    BigDecimal totalPaid,
    BigDecimal outstanding,
    BigDecimal overdue,
    long invoiceCount,
    long draftInvoiceCount,
    long openInvoiceCount,
    long overdueInvoiceCount,
    long quoteCount,
    long openQuoteCount,
    BigDecimal openQuoteValue,
    long projectCount,
    long activeProjectCount,
    LocalDate firstInvoiceDate,
    LocalDate lastInvoiceDate,
    /** Mean days from issue to settlement across settled invoices; null until one is paid. */
    Integer averageDaysToPay
) {
}
