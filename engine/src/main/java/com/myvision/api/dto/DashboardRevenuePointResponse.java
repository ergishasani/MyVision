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
 * One month of the dashboard's revenue chart.
 *
 * <p>Two series, because they answer different questions: {@code invoiced} is what was billed in
 * the month, {@code collected} is what actually arrived. A business can invoice well and still be
 * short of cash, and the gap between the two bars is the thing worth looking at.
 *
 * <p>{@code month} is the ISO year-month ("2026-08") so the client can sort and key on it without
 * parsing a display string; {@code label} is what the axis prints.
 */
public record DashboardRevenuePointResponse(
    String month,
    String label,
    BigDecimal invoiced,
    BigDecimal collected
) {
}
