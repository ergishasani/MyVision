package com.myvision.api.dto;

public record LogoUploadResponse(
    String logoUrl,
    String storagePath
) {
}
