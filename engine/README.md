# MyVision Engine

Spring Boot backend for MyVision.

## Requirements

- Java 21 or newer
- Maven
- PostgreSQL 16 (docker-compose provides one)

## Local Config

Copy:

```txt
src/main/resources/application-local.example.yml
```

to:

```txt
src/main/resources/application-local.yml
```

Then point the datasource at your PostgreSQL instance. The defaults match the
`postgres` service in the repository's `docker-compose.yml`.

## Run

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

On **PowerShell**, quote the `-D` argument:

```powershell
mvn spring-boot:run "-Dspring-boot.run.profiles=local"
```

Health check:

```txt
http://localhost:8080/api/health
```

## Production Providers

Local development logs emails instead of sending them. Production should use Resend:

```txt
MAIL_PROVIDER=resend
MAIL_FROM=MyVision <no-reply@myvision.visionbau.de>
RESEND_API_KEY=...
AUTH_FRONTEND_BASE_URL=https://myvision.visionbau.de
```

Generated documents and logos are written to the filesystem under
`storage.local-root`. **In a container that path must be a mounted volume** — on
ephemeral storage every generated invoice PDF is lost on restart.

```txt
STORAGE_LOCAL_ROOT=/var/lib/myvision/storage
STORAGE_PUBLIC_BASE_URL=https://api.myvision.example/files
```

## First Auth Endpoints

Register:

```txt
POST http://localhost:8080/api/auth/register
```

```json
{
  "fullName": "Test Owner",
  "email": "test@myvision.dev",
  "password": "Password123!",
  "companyName": "Test Construction GmbH"
}
```

Login:

```txt
POST http://localhost:8080/api/auth/login
```

Current user:

```txt
GET http://localhost:8080/api/auth/me
Authorization: Bearer YOUR_TOKEN
```

## Document Endpoints

```txt
GET  /api/invoices/{id}/pdf
POST /api/invoices/{id}/pdf
GET  /api/invoices/{id}/xrechnung
POST /api/invoices/{id}/xrechnung
GET  /api/invoices/{id}/zugferd
POST /api/company/logo
```

The `GET` routes download generated documents.
The `POST` routes generate and store documents through the configured storage provider.
The XRechnung route is an export foundation and must be validator-tested before production e-invoice delivery.
The ZUGFeRD route intentionally returns `501 NOT_IMPLEMENTED` until PDF/A-3 embedding and validator support are added.

## Package Structure

The backend uses a layer-based Spring Boot structure:

```txt
com.myvision.api
  config       Spring/OpenAPI/security configuration
  controller   REST API endpoints
  service      Business logic
  repository   Spring Data database access
  entity       JPA entities and enums
  dto          Request/response DTOs
  exception    API errors and global exception handling
  util         Security/helper infrastructure
  mapper       Reserved for DTO/entity mappers
```
