package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.math.BigDecimal;
import java.util.UUID;

/** One slice of the top-customers ring: who they are and what they were billed. */
public record DashboardTopClientResponse(
    UUID clientId,
    String name,
    BigDecimal amount,
    long invoiceCount
) {
}
