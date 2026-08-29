package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.util.List;

/**
 * Everything the contact detail screen shows, in one response.
 *
 * <p>One call rather than four: the stats have to agree with the lists they sit above, and four
 * independent requests can interleave with a payment landing and disagree.
 */
public record ClientOverviewResponse(
    ClientResponse client,
    ClientStatsResponse stats,
    List<ClientInvoiceSummaryResponse> invoices,
    List<ClientQuoteSummaryResponse> quotes,
    List<ProjectResponse> projects
) {
}
