package com.myvision.api.dto;

import com.myvision.api.entity.BookingAccount;
import java.util.UUID;

public record BookingAccountResponse(
    UUID id,
    String displayName,
    String name,
    String skrAccount
) {

  public static BookingAccountResponse from(BookingAccount account) {
    return new BookingAccountResponse(
        account.getId(), account.getDisplayName(), account.getName(), account.getSkrAccount());
  }
}
