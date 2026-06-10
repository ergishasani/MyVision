# MyVision API

Spring Boot backend for MyVision.

## Requirements

- Java 21 or newer
- Maven
- PostgreSQL or Supabase PostgreSQL

## Local Config

Copy:

```txt
src/main/resources/application-local.example.yml
```

to:

```txt
src/main/resources/application-local.yml
```

Then add the real Supabase database password.

## Run

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=local
```

Health check:

```txt
http://localhost:8080/api/health
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
