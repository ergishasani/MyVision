package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * A page of the company's activity feed, newest first.
 *
 * <p>Paged rather than capped: the feed is the audit trail, and an operator asking "who changed
 * this invoice" needs to be able to walk back through it, not just see the last five entries.
 */
public record DashboardActivityResponse(
    List<Entry> entries,
    int page,
    int size,
    long total
) {

  /**
   * One recorded action, resolved into something readable.
   *
   * <p>The audit row stores ids; this carries the names they resolve to, so the client does not
   * have to fetch every actor and document to render a sentence. {@code documentLabel} and
   * {@code clientName} are null when the referenced record has since been deleted — the log entry
   * outlives what it describes, which is the point of an audit trail.
   */
  public record Entry(
      UUID id,
      OffsetDateTime createdAt,
      String actorName,
      String entityType,
      UUID entityId,
      String action,
      String documentLabel,
      String clientName
  ) {
  }
}
