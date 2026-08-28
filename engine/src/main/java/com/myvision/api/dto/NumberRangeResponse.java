package com.myvision.api.dto;

import com.myvision.api.entity.NumberRange;
import java.util.UUID;

/**
 * One numbering counter.
 *
 * <p>{@code preview} shows what the next document would actually be called, so the effect of a
 * format is visible without having to work it out from the template.
 */
public record NumberRangeResponse(
    UUID id,
    String type,
    String format,
    Integer padding,
    Integer nextNumber,
    String preview
) {

  public static NumberRangeResponse from(NumberRange range) {
    return new NumberRangeResponse(
        range.getId(),
        range.getType().name(),
        range.getFormat(),
        range.getPadding(),
        range.getNextNumber(),
        range.render(range.getNextNumber()));
  }
}
