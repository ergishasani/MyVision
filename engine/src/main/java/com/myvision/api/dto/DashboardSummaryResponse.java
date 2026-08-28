package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.dto.ClientResponse;
import com.myvision.api.dto.InvoiceResponse;
import java.math.BigDecimal;
import java.util.List;

public record DashboardSummaryResponse(
    BigDecimal totalInvoicedThisMonth,
    BigDecimal paidAmountThisMonth,
    BigDecimal unpaidAmount,
    BigDecimal overdueAmount,
    long overdueInvoiceCount,
    long activeProjectCount,
    long pendingQuoteCount,
    List<InvoiceResponse> recentInvoices,
    List<ClientResponse> recentClients
) {
}
