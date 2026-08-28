package com.myvision.api.service;

import com.myvision.api.dto.TeamMemberResponse;
import com.myvision.api.dto.TeamMemberUpdateRequest;
import com.myvision.api.entity.CompanyMember;
import com.myvision.api.entity.CompanyMemberRole;
import com.myvision.api.exception.BadRequestException;
import com.myvision.api.exception.ForbiddenException;
import com.myvision.api.exception.ResourceNotFoundException;
import com.myvision.api.repository.CompanyMemberRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Who has access to the workspace, and what they may do.
 *
 * <p>Two rules are enforced here rather than left to the UI, because getting either wrong locks a
 * business out of its own books: a company always keeps at least one owner, and nobody may strip
 * their own ownership.
 */
@Service
public class TeamService {

  private final CompanyMemberRepository companyMemberRepository;
  private final CompanyAccessService companyAccessService;

  public TeamService(
      CompanyMemberRepository companyMemberRepository,
      CompanyAccessService companyAccessService
  ) {
    this.companyMemberRepository = companyMemberRepository;
    this.companyAccessService = companyAccessService;
  }

  @Transactional(readOnly = true)
  public List<TeamMemberResponse> list(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return companyMemberRepository.findByCompany_IdOrderByCreatedAtAsc(companyId)
        .stream()
        .map(TeamMemberResponse::from)
        .toList();
  }

  @Transactional
  public TeamMemberResponse updateRole(UUID userId, UUID memberId, TeamMemberUpdateRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    requireOwner(userId, companyId);

    CompanyMember member = companyMemberRepository.findByIdAndCompany_Id(memberId, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

    // Demoting yourself is how a workspace ends up with nobody who can restore access.
    if (member.getUser().getId().equals(userId) && request.role() != CompanyMemberRole.owner) {
      throw new BadRequestException(
          "You cannot remove your own owner role. Ask another owner to change it.");
    }
    if (member.getRole() == CompanyMemberRole.owner
        && request.role() != CompanyMemberRole.owner
        && companyMemberRepository.countByCompany_IdAndRole(companyId, CompanyMemberRole.owner) <= 1) {
      throw new BadRequestException("A company must keep at least one owner");
    }

    member.setRole(request.role());
    return TeamMemberResponse.from(companyMemberRepository.save(member));
  }

  @Transactional
  public void remove(UUID userId, UUID memberId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    requireOwner(userId, companyId);

    CompanyMember member = companyMemberRepository.findByIdAndCompany_Id(memberId, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Member not found"));

    if (member.getUser().getId().equals(userId)) {
      throw new BadRequestException("You cannot remove yourself from the company");
    }
    if (member.getRole() == CompanyMemberRole.owner
        && companyMemberRepository.countByCompany_IdAndRole(companyId, CompanyMemberRole.owner) <= 1) {
      throw new BadRequestException("A company must keep at least one owner");
    }

    // The membership goes, the user account stays: they may belong to other companies, and their
    // name still has to render on documents they created here.
    companyMemberRepository.delete(member);
  }

  private void requireOwner(UUID userId, UUID companyId) {
    CompanyMember me = companyMemberRepository.findFirstByUser_IdOrderByCreatedAtAsc(userId)
        .orElseThrow(() -> new ForbiddenException("User does not belong to any company"));
    if (!me.getCompany().getId().equals(companyId)
        || !(me.getRole() == CompanyMemberRole.owner || me.getRole() == CompanyMemberRole.admin)) {
      throw new ForbiddenException("Only an owner or admin can manage team members");
    }
  }
}
