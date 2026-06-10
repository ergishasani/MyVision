package com.myvision.api.service;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

  private final AuditLogRepository auditLogRepository;

  public AuditLogService(AuditLogRepository auditLogRepository) {
    this.auditLogRepository = auditLogRepository;
  }

  public void record(
      UUID companyId,
      UUID actorUserId,
      String entityType,
      UUID entityId,
      String action,
      String metadata
  ) {
    AuditLog log = new AuditLog();
    log.setCompanyId(companyId);
    log.setActorUserId(actorUserId);
    log.setEntityType(entityType);
    log.setEntityId(entityId);
    log.setAction(action);
    log.setMetadata(metadata == null || metadata.isBlank() ? "{}" : metadata);
    auditLogRepository.save(log);
  }
}

