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
 * The current VAT advance-return period, as far as this system can see it.
 *
 * <p>{@code outputVat} is tax invoiced on sales. Input tax is not modelled — there are no
 * purchases in this system — so {@code inputVatAvailable} is false and {@code payable} equals the
 * output tax. That is deliberately not presented as a filing figure: without input tax it is only
 * one side of the return, and the screen says so.
 */
public record DashboardVatResponse(
    LocalDate periodStart,
    LocalDate periodEnd,
    LocalDate dueDate,
    BigDecimal outputVat,
    BigDecimal netRevenue,
    BigDecimal payable,
    boolean inputVatAvailable
) {
}
