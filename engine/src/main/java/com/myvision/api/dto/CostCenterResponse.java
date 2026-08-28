package com.myvision.api.dto;

import com.myvision.api.entity.CostCenter;
import java.util.UUID;

public record CostCenterResponse(
    UUID id,
    String name,
    String number
) {

  public static CostCenterResponse from(CostCenter center) {
    return new CostCenterResponse(center.getId(), center.getName(), center.getNumber());
  }
}
