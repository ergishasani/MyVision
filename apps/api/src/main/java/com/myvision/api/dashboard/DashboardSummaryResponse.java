package com.myvision.api.dashboard;

import com.myvision.api.client.ClientResponse;
import com.myvision.api.invoice.InvoiceResponse;
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
