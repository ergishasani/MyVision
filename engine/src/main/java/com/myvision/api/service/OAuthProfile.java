package com.myvision.api.service;

public record OAuthProfile(
    String subject,
    String email,
    String fullName,
    boolean emailVerified
) {
}
