package com.myvision.api.service;

import com.myvision.api.dto.StorageObject;

public interface FileStorageService {

  StorageObject put(String path, String contentType, byte[] content);

  StorageObject putPublic(String path, String contentType, byte[] content);
}
