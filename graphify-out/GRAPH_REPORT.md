# Graph Report - MyVision  (2026-06-10)

## Corpus Check
- 159 files · ~23,416 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1403 nodes · 2662 edges · 70 communities (62 shown, 8 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 236 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4ff09976`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 92|Community 92]]

## God Nodes (most connected - your core abstractions)
1. `Exception` - 104 edges
2. `Company` - 50 edges
3. `Invoice` - 44 edges
4. `String` - 42 edges
5. `Quote` - 36 edges
6. `Project` - 34 edges
7. `Client` - 32 edges
8. `InvoiceItem` - 25 edges
9. `QuoteItem` - 25 edges
10. `String` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Company` --inherits--> `BaseEntity`  [EXTRACTED]
  apps/api/src/main/java/com/myvision/api/entity/Company.java → apps/api/src/main/java/com/myvision/api/entity/BaseEntity.java
- `Invoice` --inherits--> `BaseEntity`  [EXTRACTED]
  apps/api/src/main/java/com/myvision/api/entity/Invoice.java → apps/api/src/main/java/com/myvision/api/entity/BaseEntity.java
- `Project` --inherits--> `BaseEntity`  [EXTRACTED]
  apps/api/src/main/java/com/myvision/api/entity/Project.java → apps/api/src/main/java/com/myvision/api/entity/BaseEntity.java
- `Quote` --inherits--> `BaseEntity`  [EXTRACTED]
  apps/api/src/main/java/com/myvision/api/entity/Quote.java → apps/api/src/main/java/com/myvision/api/entity/BaseEntity.java
- `User` --inherits--> `BaseEntity`  [EXTRACTED]
  apps/api/src/main/java/com/myvision/api/entity/User.java → apps/api/src/main/java/com/myvision/api/entity/BaseEntity.java

## Communities (70 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (37): checkHealth(), getCurrentUser(), login(), register(), ApiError, apiFetch(), ApiFetchOptions, getDashboardSummary() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (42): Optional, UUID, List, QuoteItem, UUID, Client, ClientRepository, ClientRequest (+34 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (24): Invoice, InvoiceItem, InvoiceResponse, List, BigDecimal, InvoiceStatus, LocalDate, OffsetDateTime (+16 more)

### Community 3 - "Community 3"
Cohesion: 0.21
Nodes (13): CurrentUserPrincipal, GetMapping, InvoiceResponse, List, PatchMapping, PostMapping, QuoteRequest, QuoteResponse (+5 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (21): Project, ProjectResponse, BigDecimal, LocalDate, ProjectStatus, String, UUID, ClientService (+13 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (4): CompanyResponse, Exception, AuditLogRepository, CompanySettingsRepository

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (13): Client, ClientResponse, OffsetDateTime, PrePersist, PreUpdate, UUID, OffsetDateTime, String (+5 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (14): String, User, UUID, HttpServletRequest, HttpServletResponse, JwtService, Override, Claims (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (38): OffsetDateTime, String, UUID, Company, Optional, Query, UUID, InvoiceItem (+30 more)

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (12): Bean, HttpServletResponse, PasswordEncoder, String, AuthenticationConfiguration, AuthenticationManager, SecurityConfig, CorsConfigurationSource (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.07
Nodes (9): Company, Integer, String, Company, String, Company, String, from() (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (9): Payment, PaymentResponse, BigDecimal, OffsetDateTime, String, UUID, from(), Payment (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (14): AbstractIntegrationTest, String, Test, Test, Test, Test, Test, AuthIntegrationTest (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.08
Nodes (25): AccessDeniedException, ApiError, CurrentUserPrincipal, Override, String, UserDetails, UserRepository, UUID (+17 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (12): List, Quote, QuoteItem, QuoteResponse, BigDecimal, LocalDate, OffsetDateTime, QuoteStatus (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.10
Nodes (27): BigDecimal, Collection, Invoice, InvoiceStatus, List, LocalDate, Optional, Query (+19 more)

### Community 16 - "Community 16"
Cohesion: 0.11
Nodes (7): BigDecimal, Integer, LineItemKind, OffsetDateTime, String, UUID, InvoiceItem

### Community 17 - "Community 17"
Cohesion: 0.08
Nodes (23): dependencies, clsx, next, react, react-dom, tailwind-merge, devDependencies, eslint (+15 more)

### Community 18 - "Community 18"
Cohesion: 0.50
Nodes (3): EmailVerificationTokenRepository, PasswordResetTokenRepository, RefreshTokenRepository

### Community 19 - "Community 19"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 20 - "Community 20"
Cohesion: 0.12
Nodes (9): String, String, String, String, BadRequestException, ForbiddenException, ResourceNotFoundException, UnauthorizedException (+1 more)

### Community 21 - "Community 21"
Cohesion: 0.12
Nodes (8): User, OffsetDateTime, String, ResetPasswordRequest, from(), User, UserResponse, UserStatus

### Community 22 - "Community 22"
Cohesion: 0.11
Nodes (13): Company, OffsetDateTime, User, UUID, Override, CompanyMemberRole, CompanyMember, JavaType (+5 more)

### Community 23 - "Community 23"
Cohesion: 0.11
Nodes (7): BigDecimal, Integer, LineItemKind, OffsetDateTime, String, UUID, QuoteItem

### Community 24 - "Community 24"
Cohesion: 0.14
Nodes (13): code:txt (src/main/resources/application-local.example.yml), code:txt (src/main/resources/application-local.yml), code:bash (mvn spring-boot:run -Dspring-boot.run.profiles=local), code:txt (http://localhost:8080/api/health), code:txt (POST http://localhost:8080/api/auth/register), code:json ({), code:txt (POST http://localhost:8080/api/auth/login), code:txt (GET http://localhost:8080/api/auth/me) (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.24
Nodes (10): CurrentUserPrincipal, GetMapping, List, PaymentRequest, PaymentResponse, PostMapping, ResponseStatus, UUID (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (18): AuthResponse, CurrentUserPrincipal, ForgotPasswordRequest, GetMapping, HttpServletRequest, LoginRequest, LogoutRequest, MessageResponse (+10 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (11): API Design, Authentication, Clients, code:json ({), Dashboard, Error format, Invoices, Multi-tenancy (+3 more)

### Community 28 - "Community 28"
Cohesion: 0.18
Nodes (10): name, private, scripts, build, build:web, dev, dev:web, lint (+2 more)

### Community 29 - "Community 29"
Cohesion: 0.12
Nodes (8): BigDecimal, Company, OffsetDateTime, PrePersist, PreUpdate, String, UUID, CompanySettings

### Community 30 - "Community 30"
Cohesion: 0.18
Nodes (12): AuthResponse, Company, LoginRequest, LogoutRequest, RefreshRequest, RegisterRequest, String, Transactional (+4 more)

### Community 31 - "Community 31"
Cohesion: 0.19
Nodes (9): CompanyMemberRepository, CompanyRepository, JwtService, PasswordEncoder, UserRepository, BadRequestException, CompanySettingsRepository, AuthRateLimiter (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.18
Nodes (10): Backend (port 8080), code:txt (apps/web  - Next.js frontend), code:bash (docker compose up -d --build), code:bash (cp apps/web/.env.local.example apps/web/.env.local), Frontend (port 3000), Local development, MyVision, Production readiness (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (12): CurrentUserPrincipal, GetMapping, InvoiceRequest, InvoiceResponse, InvoiceService, InvoiceUpdateRequest, List, PatchMapping (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.20
Nodes (13): ClientRequest, ClientResponse, ClientService, ClientUpdateRequest, CurrentUserPrincipal, DeleteMapping, GetMapping, List (+5 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (8): code:bash (supabase start), code:txt (supabase/migrations/20260610150000_initial_schema.sql), code:txt (apps/api/src/main/resources/db/migration/V1__initial_schema.), code:txt (DATABASE_URL=your-supabase-postgres-connection-string), Local Development, Production, Spring Boot, Supabase Setup

### Community 36 - "Community 36"
Cohesion: 0.32
Nodes (5): CurrentUserPrincipal, DashboardSummaryResponse, GetMapping, DashboardController, DashboardService

### Community 37 - "Community 37"
Cohesion: 0.20
Nodes (13): CurrentUserPrincipal, DeleteMapping, GetMapping, List, PatchMapping, PostMapping, ProjectRequest, ProjectResponse (+5 more)

### Community 38 - "Community 38"
Cohesion: 0.22
Nodes (8): EmailVerificationToken, PasswordResetToken, RefreshToken, String, Transactional, User, IssuedRefreshToken, TokenService

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (5): plugins, stripe, supabase, enabled, enabled

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): code:txt (users -> company_members <- companies), Database Schema, Migration Files, Relationships, Tables

### Community 41 - "Community 41"
Cohesion: 0.60
Nodes (3): Bean, OpenApiConfig, OpenAPI

### Community 42 - "Community 42"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 44 - "Community 44"
Cohesion: 0.21
Nodes (4): OffsetDateTime, String, UUID, RefreshToken

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (3): InvoiceItem, from(), InvoiceItemResponse

### Community 46 - "Community 46"
Cohesion: 0.50
Nodes (3): QuoteItem, from(), QuoteItemResponse

### Community 47 - "Community 47"
Cohesion: 0.23
Nodes (4): OffsetDateTime, String, UUID, EmailVerificationToken

### Community 57 - "Community 57"
Cohesion: 0.23
Nodes (4): OffsetDateTime, String, UUID, PasswordResetToken

### Community 58 - "Community 58"
Cohesion: 0.44
Nodes (5): Client, List, Optional, UUID, ClientRepository

### Community 59 - "Community 59"
Cohesion: 0.33
Nodes (7): BigDecimal, List, OffsetDateTime, Payment, Query, UUID, PaymentRepository

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (6): List, Optional, Project, ProjectStatus, UUID, ProjectRepository

### Community 61 - "Community 61"
Cohesion: 0.24
Nodes (6): Optional, String, User, ForgotPasswordRequest, MessageResponse, UserRepository

### Community 62 - "Community 62"
Cohesion: 0.47
Nodes (4): GetMapping, Map, String, HealthController

### Community 63 - "Community 63"
Cohesion: 0.40
Nodes (4): EmailVerificationToken, Optional, String, EmailVerificationTokenRepository

### Community 64 - "Community 64"
Cohesion: 0.40
Nodes (4): Optional, PasswordResetToken, String, PasswordResetTokenRepository

### Community 65 - "Community 65"
Cohesion: 0.40
Nodes (4): Optional, RefreshToken, String, RefreshTokenRepository

### Community 66 - "Community 66"
Cohesion: 0.50
Nodes (4): ApiError, Map, String, of()

### Community 67 - "Community 67"
Cohesion: 0.60
Nodes (4): MessageResponse, String, of(), withToken()

### Community 92 - "Community 92"
Cohesion: 0.33
Nodes (5): code:txt (DATABASE_URL), Environment Variables, Implemented, Production Readiness, Provider-Dependent Work

## Knowledge Gaps
- **216 isolated node(s):** `name`, `private`, `workspaces`, `dev`, `dev:web` (+211 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Exception` connect `Community 5` to `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 13`, `Community 14`, `Community 15`, `Community 16`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 26`, `Community 29`, `Community 31`, `Community 33`, `Community 34`, `Community 36`, `Community 37`, `Community 38`, `Community 41`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`?**
  _High betweenness centrality (0.550) - this node is a cross-community bridge._
- **Why does `Invoice` connect `Community 2` to `Community 8`, `Community 6`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `Company` connect `Community 10` to `Community 8`, `Community 6`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `name`, `private`, `workspaces` to the rest of the system?**
  _216 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06421052631578947 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06293706293706294 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05200341005967604 - nodes in this community are weakly interconnected._