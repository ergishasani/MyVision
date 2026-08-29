package com.myvision.api.entity;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

/**
 * The life of a delivery note.
 *
 * <p>Shorter than an invoice's because nothing is owed on one: it is issued, it goes out, the
 * goods arrive. There is no paid state and no overdue state.
 */
public enum DeliveryNoteStatus {
  draft,
  sent,
  delivered,
  cancelled
}
