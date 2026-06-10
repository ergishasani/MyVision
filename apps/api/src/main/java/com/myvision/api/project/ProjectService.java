package com.myvision.api.project;

import com.myvision.api.client.ClientService;
import com.myvision.api.common.BadRequestException;
import com.myvision.api.common.CompanyAccessService;
import com.myvision.api.common.ResourceNotFoundException;
import com.myvision.api.company.Company;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {

  private final ProjectRepository projectRepository;
  private final ClientService clientService;
  private final CompanyAccessService companyAccessService;

  public ProjectService(
      ProjectRepository projectRepository,
      ClientService clientService,
      CompanyAccessService companyAccessService
  ) {
    this.projectRepository = projectRepository;
    this.clientService = clientService;
    this.companyAccessService = companyAccessService;
  }

  @Transactional(readOnly = true)
  public List<ProjectResponse> list(UUID userId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return projectRepository.findByCompanyIdOrderByCreatedAtDesc(companyId)
        .stream()
        .map(ProjectResponse::from)
        .toList();
  }

  @Transactional(readOnly = true)
  public ProjectResponse get(UUID userId, UUID projectId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    return ProjectResponse.from(requireProject(projectId, companyId));
  }

  @Transactional
  public ProjectResponse create(UUID userId, ProjectRequest request) {
    Company company = companyAccessService.currentCompany(userId);
    UUID companyId = company.getId();

    clientService.requireActiveClient(request.clientId(), companyId);
    validateDates(request.startDate(), request.endDate());

    Project project = new Project();
    project.setCompanyId(companyId);
    project.setClientId(request.clientId());
    project.setName(request.name().trim());
    project.setCode(request.code());
    project.setStatus(request.status() != null ? request.status() : ProjectStatus.draft);
    project.setJobSiteAddressLine1(request.jobSiteAddressLine1());
    project.setJobSiteAddressLine2(request.jobSiteAddressLine2());
    project.setJobSiteCity(request.jobSiteCity());
    project.setJobSiteRegion(request.jobSiteRegion());
    project.setJobSitePostalCode(request.jobSitePostalCode());
    if (request.jobSiteCountryCode() != null) {
      project.setJobSiteCountryCode(request.jobSiteCountryCode().toUpperCase());
    } else {
      project.setJobSiteCountryCode(company.getCountryCode());
    }
    project.setStartDate(request.startDate());
    project.setEndDate(request.endDate());
    project.setBudgetAmount(request.budgetAmount());
    project.setCurrency(request.currency() != null
        ? request.currency().toUpperCase()
        : company.getDefaultCurrency());
    project.setDescription(request.description());

    return ProjectResponse.from(projectRepository.save(project));
  }

  @Transactional
  public ProjectResponse update(UUID userId, UUID projectId, ProjectUpdateRequest request) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Project project = requireProject(projectId, companyId);

    if (request.clientId() != null) {
      clientService.requireActiveClient(request.clientId(), companyId);
      project.setClientId(request.clientId());
    }
    if (request.name() != null) {
      project.setName(request.name().trim());
    }
    if (request.code() != null) {
      project.setCode(request.code());
    }
    if (request.status() != null) {
      project.setStatus(request.status());
    }
    if (request.jobSiteAddressLine1() != null) {
      project.setJobSiteAddressLine1(request.jobSiteAddressLine1());
    }
    if (request.jobSiteAddressLine2() != null) {
      project.setJobSiteAddressLine2(request.jobSiteAddressLine2());
    }
    if (request.jobSiteCity() != null) {
      project.setJobSiteCity(request.jobSiteCity());
    }
    if (request.jobSiteRegion() != null) {
      project.setJobSiteRegion(request.jobSiteRegion());
    }
    if (request.jobSitePostalCode() != null) {
      project.setJobSitePostalCode(request.jobSitePostalCode());
    }
    if (request.jobSiteCountryCode() != null) {
      project.setJobSiteCountryCode(request.jobSiteCountryCode().toUpperCase());
    }
    if (request.startDate() != null) {
      project.setStartDate(request.startDate());
    }
    if (request.endDate() != null) {
      project.setEndDate(request.endDate());
    }
    validateDates(project.getStartDate(), project.getEndDate());
    if (request.budgetAmount() != null) {
      project.setBudgetAmount(request.budgetAmount());
    }
    if (request.currency() != null) {
      project.setCurrency(request.currency().toUpperCase());
    }
    if (request.description() != null) {
      project.setDescription(request.description());
    }

    return ProjectResponse.from(projectRepository.save(project));
  }

  @Transactional
  public void delete(UUID userId, UUID projectId) {
    UUID companyId = companyAccessService.currentCompanyId(userId);
    Project project = requireProject(projectId, companyId);
    projectRepository.delete(project);
  }

  /** Tenant-safe lookup used by the quote and invoice domains. */
  public Project requireProject(UUID projectId, UUID companyId) {
    return projectRepository.findByIdAndCompanyId(projectId, companyId)
        .orElseThrow(() -> new ResourceNotFoundException("Project not found"));
  }

  private void validateDates(java.time.LocalDate startDate, java.time.LocalDate endDate) {
    if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
      throw new BadRequestException("End date must not be before start date");
    }
  }
}
