package com.myvision.api.common;

import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
@Tag(name = "Health", description = "Service health check")
public class HealthController {

  @GetMapping
  public Map<String, String> health() {
    return Map.of(
        "status", "ok",
        "service", "myvision-api"
    );
  }
}

