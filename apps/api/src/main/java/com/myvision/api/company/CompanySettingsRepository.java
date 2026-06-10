package com.myvision.api.company;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanySettingsRepository extends JpaRepository<CompanySettings, UUID> {
}

