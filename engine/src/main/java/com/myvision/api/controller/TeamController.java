package com.myvision.api.controller;

import com.myvision.api.dto.TeamMemberResponse;
import com.myvision.api.dto.TeamMemberUpdateRequest;
import com.myvision.api.service.TeamService;
import com.myvision.api.util.CurrentUserPrincipal;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/team")
@Tag(name = "Team", description = "Who has access to the workspace and what they may do.")
public class TeamController {

  private final TeamService teamService;

  public TeamController(TeamService teamService) {
    this.teamService = teamService;
  }

  @GetMapping("/members")
  public List<TeamMemberResponse> members(@AuthenticationPrincipal CurrentUserPrincipal principal) {
    return teamService.list(principal.getUserId());
  }

  @PatchMapping("/members/{id}")
  public TeamMemberResponse updateRole(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id,
      @Valid @RequestBody TeamMemberUpdateRequest request
  ) {
    return teamService.updateRole(principal.getUserId(), id, request);
  }

  @DeleteMapping("/members/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(
      @AuthenticationPrincipal CurrentUserPrincipal principal,
      @PathVariable UUID id
  ) {
    teamService.remove(principal.getUserId(), id);
  }
}
