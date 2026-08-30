package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import jakarta.validation.constraints.Size;
import java.util.List;

/** The complete set of tags for an invoice. Replaces whatever was there. */
public record InvoiceTagsRequest(
    @Size(max = 25)
    List<@Size(max = 40) String> tags
) {
}
