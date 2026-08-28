package com.myvision.api.service;

import com.myvision.api.dto.StorageObject;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Filesystem-backed storage for generated documents and company logos.
 *
 * <p>Objects are written under {@code storage.local-root}. In a container that directory must be a
 * mounted volume: on ephemeral storage every generated invoice PDF disappears on restart.
 *
 * <p>Public objects (logos) are served from {@code storage.public-base-url}; private ones
 * (invoice PDFs, XRechnung XML) get a null public URL and are streamed through the API instead.
 */
@Service
public class ProviderFileStorageService implements FileStorageService {

  private final Path localRoot;
  private final String publicBaseUrl;

  public ProviderFileStorageService(
      @Value("${storage.local-root}") String localRoot,
      @Value("${storage.public-base-url}") String publicBaseUrl
  ) {
    this.localRoot = Path.of(localRoot);
    this.publicBaseUrl = trimTrailingSlash(publicBaseUrl);
  }

  @Override
  public StorageObject put(String path, String contentType, byte[] content) {
    return write(normalizePath(path), content, false);
  }

  @Override
  public StorageObject putPublic(String path, String contentType, byte[] content) {
    return write(normalizePath(path), content, true);
  }

  private StorageObject write(String path, byte[] content, boolean publicObject) {
    try {
      Path target = localRoot.resolve(path).normalize();
      // A path traversing out of the root would let a crafted file name overwrite anything the
      // process can reach.
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
