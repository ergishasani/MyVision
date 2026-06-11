package com.myvision.api.service;

import com.myvision.api.dto.StorageObject;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class ProviderFileStorageService implements FileStorageService {

  private final RestClient restClient;
  private final String provider;
  private final Path localRoot;
  private final String publicBaseUrl;
  private final String supabaseUrl;
  private final String supabaseServiceRoleKey;
  private final String supabaseDocumentsBucket;
  private final String supabasePublicBucket;

  public ProviderFileStorageService(
      RestClient.Builder restClientBuilder,
      @Value("${storage.provider}") String provider,
      @Value("${storage.local-root}") String localRoot,
      @Value("${storage.public-base-url}") String publicBaseUrl,
      @Value("${storage.supabase.url}") String supabaseUrl,
      @Value("${storage.supabase.service-role-key}") String supabaseServiceRoleKey,
      @Value("${storage.supabase.documents-bucket}") String supabaseDocumentsBucket,
      @Value("${storage.supabase.public-bucket}") String supabasePublicBucket
  ) {
    this.restClient = restClientBuilder.build();
    this.provider = provider;
    this.localRoot = Path.of(localRoot);
    this.publicBaseUrl = trimTrailingSlash(publicBaseUrl);
    this.supabaseUrl = trimTrailingSlash(supabaseUrl);
    this.supabaseServiceRoleKey = supabaseServiceRoleKey;
    this.supabaseDocumentsBucket = supabaseDocumentsBucket;
    this.supabasePublicBucket = supabasePublicBucket;
  }

  @Override
  public StorageObject put(String path, String contentType, byte[] content) {
    return put(path, contentType, content, false);
  }

  @Override
  public StorageObject putPublic(String path, String contentType, byte[] content) {
    return put(path, contentType, content, true);
  }

  private StorageObject put(String path, String contentType, byte[] content, boolean publicObject) {
    String normalizedPath = normalizePath(path);
    if ("supabase".equalsIgnoreCase(provider)) {
      return putSupabase(normalizedPath, contentType, content, publicObject);
    }
    return putLocal(normalizedPath, content, publicObject);
  }

  private StorageObject putSupabase(String path, String contentType, byte[] content, boolean publicObject) {
    if (supabaseUrl.isBlank() || supabaseServiceRoleKey == null || supabaseServiceRoleKey.isBlank()) {
      throw new IllegalStateException(
          "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required when STORAGE_PROVIDER=supabase");
    }
    String bucket = publicObject ? supabasePublicBucket : supabaseDocumentsBucket;
    String encodedPath = encodePath(path);
    restClient.post()
        .uri("%s/storage/v1/object/%s/%s".formatted(supabaseUrl, bucket, encodedPath))
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + supabaseServiceRoleKey)
        .header("apikey", supabaseServiceRoleKey)
        .header("x-upsert", "true")
        .contentType(MediaType.parseMediaType(contentType))
        .body(content)
        .retrieve()
        .toBodilessEntity();

    String publicUrl = publicObject
        ? "%s/storage/v1/object/public/%s/%s".formatted(supabaseUrl, bucket, encodedPath)
        : null;
    return new StorageObject(path, publicUrl, content.length);
  }

  private StorageObject putLocal(String path, byte[] content, boolean publicObject) {
    try {
      Path target = localRoot.resolve(path).normalize();
      if (!target.startsWith(localRoot.normalize())) {
        throw new IllegalArgumentException("Invalid storage path");
      }
      Files.createDirectories(target.getParent());
      Files.write(target, content);
      String publicUrl = publicObject ? publicBaseUrl + "/" + encodePath(path) : null;
      return new StorageObject(path, publicUrl, content.length);
    } catch (IOException exception) {
      throw new IllegalStateException("Could not write storage object", exception);
    }
  }

  private String normalizePath(String path) {
    return path.replace("\\", "/").replaceAll("^/+", "");
  }

  private String encodePath(String path) {
    return URLEncoder.encode(path, StandardCharsets.UTF_8).replace("+", "%20").replace("%2F", "/");
  }

  private String trimTrailingSlash(String value) {
    if (value == null) {
      return "";
    }
    return value.replaceAll("/+$", "");
  }
}
