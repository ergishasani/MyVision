# MyVision

MyVision is a SaaS invoicing and project billing platform for small construction and service businesses.

## Stack

- Frontend: Next.js, TypeScript, Tailwind CSS
- Backend: Java 21, Spring Boot 3
- Database: PostgreSQL
- Migrations: Flyway
- Auth: Spring Security with JWT

## Workspace

```txt
apps/web  - Next.js frontend
apps/api  - Spring Boot backend
packages  - shared code and types
docs      - product and technical planning
infra     - deployment and infrastructure config
scripts   - local helper scripts
```

## Local development

### Backend (port 8080)

```bash
docker compose up -d --build
```

API docs: http://localhost:8080/docs

### Frontend (port 3000)

```bash
cp apps/web/.env.local.example apps/web/.env.local
npm install
npm run dev
```

Open http://localhost:3000 — register or sign in, then use the dashboard.

The frontend reads `NEXT_PUBLIC_API_URL` (default `http://localhost:8080/api`).

## Production readiness

- CI runs backend tests and frontend lint/build in GitHub Actions.
- Backend integration tests use Testcontainers, so Docker must be available in CI.
- Set a strong `JWT_SECRET` in production.
- Set production database credentials through environment variables, not committed files.
- The frontend build uses system fonts so CI does not depend on Google Fonts network fetches.
- See `docs/production-readiness.md` for auth/session/audit details and remaining provider-dependent work.
