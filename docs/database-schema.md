# Database Schema

MyVision should use a multi-tenant schema where every business account owns its own data through `companies`.

Recommended setup:

- Spring Boot owns authentication, authorization, validation, and business logic.
- Supabase is used as managed PostgreSQL, the database dashboard, and storage later.
- The frontend should call Spring Boot, not Supabase directly.

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

The schema is stored in two places:

- `supabase/migrations/20260610150000_initial_schema.sql`
- `apps/api/src/main/resources/db/migration/V1__initial_schema.sql`

Use the Supabase migration for Supabase projects. Use the Flyway migration from the Spring Boot backend.

