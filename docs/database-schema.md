# Database Schema

MyVision should use a multi-tenant schema where every business account owns its own data through `companies`.

Recommended setup:

- Spring Boot owns authentication, authorization, validation, and business logic.
- PostgreSQL is the database; any managed or self-hosted instance works.
- The frontend calls Spring Boot, never the database directly.

## Tables

Core identity:

- `users`
- `companies`
- `company_members`

Business records:

- `clients`
- `projects`
- `quotes`
- `quote_items`
- `invoices`
- `invoice_items`
- `payments`
- `company_settings`
- `documents`

## Relationships

```txt
users -> company_members <- companies
companies -> clients
companies -> projects
companies -> quotes
companies -> invoices
clients -> projects
clients -> quotes
clients -> invoices
projects -> quotes
projects -> invoices
quotes -> quote_items
quotes -> invoices
invoices -> invoice_items
invoices -> payments
quotes/invoices -> documents
```

## Migration Files

Flyway owns the schema, and it is the single source of truth:

- `engine/src/main/resources/db/migration/`

Migrations run automatically on backend start. Never edit a migration that has already
been applied; add a new one.

