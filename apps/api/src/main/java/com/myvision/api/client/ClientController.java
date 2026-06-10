package com.myvision.api.client;

import com.myvision.api.auth.CurrentUserPrincipal;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clients")
@Tag(name = "Clients", description = "Company clients (customers). DELETE archives instead of removing.")
public class ClientController {

  private final ClientService clientService;

  public ClientController(ClientService clientService) {
    this.clientService = clientService;
  }

  @GetMapping
  public List<ClientResponse> list(@AuthenticationPrincipal CurrentUserPrincipal principal) {
    return clientService.list(principal.getUserId());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ClientResponse create(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @Valid @RequestBody ClientRequest request
  ) {
    return clientService.create(principal.getUserId(), request);
  }

  @GetMapping("/{id}")
  public ClientResponse get(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    return clientService.get(principal.getUserId(), id);
  }

  @PatchMapping("/{id}")
  public ClientResponse update(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody ClientUpdateRequest request
  ) {
    return clientService.update(principal.getUserId(), id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void archive(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    clientService.archive(principal.getUserId(), id);
  }
}
