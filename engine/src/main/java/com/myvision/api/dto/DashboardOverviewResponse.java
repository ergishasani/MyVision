package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Everything the overview screen shows, in one response.
 *
 * <p>Assembled server-side so the panels agree with each other. Receivables, the monthly series
 * and the customer ring are all views of the same invoices; computed from separate requests they
 * could be read a fraction of a second apart and disagree, and two panels contradicting each other
 * on a billing dashboard reads as broken books.
 *
 * <p>What is missing is missing on purpose. This system records sales, not purchases, so there is
 * no expense side: no cost of goods, no bank feed, no receipts to match. The flags say so rather
 * than letting the screen imply a zero it cannot stand behind.
 */
public record DashboardOverviewResponse(
    String currency,
    String greetingName,
    String companyName,

    /** Newest month last, so the client can render it straight onto an axis. */
    List<DashboardRevenuePointResponse> revenue,
    BigDecimal revenueInvoicedTotal,
    BigDecimal revenueCollectedTotal,

    DashboardReceivablesResponse receivables,
    DashboardVatResponse vat,

    List<DashboardTopClientResponse> topClients,
    List<DashboardTopProductResponse> topProducts,

    long draftInvoiceCount,
    long openQuoteCount,
    long activeProjectCount,
    long clientCount,

    /**
     * False throughout: purchases, bank transactions and receipt matching are not modelled. The
     * panels that need them render as locked rather than as zero.
     */
    boolean expensesAvailable,
    boolean bankAvailable
) {
}
