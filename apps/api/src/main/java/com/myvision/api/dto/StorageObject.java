package com.myvision.api.dto;

public record StorageObject(
    String path,
    String publicUrl,
    long sizeBytes
) {
}
