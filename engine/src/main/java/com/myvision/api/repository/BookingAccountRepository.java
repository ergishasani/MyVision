package com.myvision.api.repository;

import com.myvision.api.entity.BookingAccount;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingAccountRepository extends JpaRepository<BookingAccount, UUID> {

  List<BookingAccount> findByCompanyIdAndArchivedAtIsNullOrderByDisplayNameAsc(UUID companyId);

  Optional<BookingAccount> findByIdAndCompanyId(UUID id, UUID companyId);
}
