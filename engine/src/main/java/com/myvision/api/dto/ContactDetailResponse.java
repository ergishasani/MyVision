package com.myvision.api.dto;

import com.myvision.api.entity.ClientContactDetail;
import java.util.UUID;

public record ContactDetailResponse(
    UUID id,
    String kind,
    String label,
    String value,
    int position
) {

  public static ContactDetailResponse from(ClientContactDetail detail) {
    return new ContactDetailResponse(
        detail.getId(),
        detail.getKind().name(),
        detail.getLabel().name(),
        detail.getValue(),
        detail.getPosition()
    );
  }
}
