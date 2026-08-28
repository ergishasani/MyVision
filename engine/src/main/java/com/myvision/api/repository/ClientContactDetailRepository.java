package com.myvision.api.repository;

import com.myvision.api.entity.ClientContactDetail;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClientContactDetailRepository extends JpaRepository<ClientContactDetail, UUID> {

  List<ClientContactDetail> findByClientIdOrderByKindAscPositionAsc(UUID clientId);

  List<ClientContactDetail> findByClientIdIn(Collection<UUID> clientIds);

  void deleteByClientId(UUID clientId);
}
