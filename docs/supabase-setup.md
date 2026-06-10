# Supabase Setup

For MyVision, Supabase should be used as managed PostgreSQL and storage.

Spring Boot should remain the main backend. The frontend should call Spring Boot APIs, and Spring Boot should connect to Supabase PostgreSQL through `DATABASE_URL`.

## Local Development

If you use the Supabase CLI:

```bash
supabase start
supabase db reset
```

The local database migration is in:

```txt
supabase/migrations/20260610150000_initial_schema.sql
```

## Spring Boot

Spring Boot can run the same schema through Flyway:

```txt
apps/api/src/main/resources/db/migration/V1__initial_schema.sql
```

## Production

Create a Supabase project and set:

```txt
DATABASE_URL=your-supabase-postgres-connection-string
```

Then run the migration in Supabase or through the Supabase connector.

