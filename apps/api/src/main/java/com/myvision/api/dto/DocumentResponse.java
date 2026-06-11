package com.myvision.api.dto;

public record DocumentResponse(
    String fileName,
    String contentType,
    long sizeBytes,
    String storagePath,
    String publicUrl
) {
}
