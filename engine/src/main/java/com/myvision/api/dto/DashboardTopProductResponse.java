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
 * Revenue for one line description.
 *
 * <p>Grouped by the text on the invoice line, not by product id: invoice lines are free text and
 * carry no link back to the catalogue. Two lines worded differently for the same article are
 * therefore counted separately, which is why the screen calls this "by line description" rather
 * than claiming to be a product report.
 */
public record DashboardTopProductResponse(
    String description,
    BigDecimal amount,
    BigDecimal quantity
) {
}
