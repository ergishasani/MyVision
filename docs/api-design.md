# API Design

Base URL: `/api`

Interactive documentation (Swagger UI) is served by the API itself at **`/docs`**
(e.g. http://localhost:8080/docs). The raw OpenAPI spec is at `/v3/api-docs`.

## Authentication

All endpoints except `register`, `login` and `health` require a JWT in the
`Authorization: Bearer <token>` header. Tokens are returned by register/login.

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create user + company + owner membership, returns JWT |
| POST | `/api/auth/login` | Login, returns JWT + user + company |
| GET | `/api/auth/me` | Current user and company |
| GET | `/api/health` | Health check (public) |

## Clients

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/clients` | List active (non-archived) clients |
| POST | `/api/clients` | Create client |
| GET | `/api/clients/{id}` | Get client |
| PATCH | `/api/clients/{id}` | Partial update |
| DELETE | `/api/clients/{id}` | Soft delete (sets `archivedAt`) |

## Projects

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project (client must belong to company) |
| GET | `/api/projects/{id}` | Get project |
| PATCH | `/api/projects/{id}` | Partial update |
| DELETE | `/api/projects/{id}` | Delete project |

## Quotes

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/quotes` | List quotes with items |
| POST | `/api/quotes` | Create quote (auto-numbers via company `quotePrefix`) |
| GET | `/api/quotes/{id}` | Get quote with items |
| PATCH | `/api/quotes/{id}` | Update draft quote (items replaced if provided) |
| POST | `/api/quotes/{id}/send` | draft → sent |
| POST | `/api/quotes/{id}/accept` | sent → accepted |
| POST | `/api/quotes/{id}/reject` | sent → rejected |
| POST | `/api/quotes/{id}/convert-to-invoice` | accepted → converted, creates invoice |

## Invoices

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/invoices` | List invoices with items |
| POST | `/api/invoices` | Create invoice (auto-numbers via company `invoicePrefix`) |
| GET | `/api/invoices/{id}` | Get invoice with items |
| PATCH | `/api/invoices/{id}` | Update draft invoice (items replaced if provided) |
| POST | `/api/invoices/{id}/mark-sent` | draft → sent |
| POST | `/api/invoices/{id}/mark-paid` | Mark fully paid |
| POST | `/api/invoices/{id}/cancel` | Cancel (unless paid) |

## Payments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/invoices/{invoiceId}/payments` | List payments for an invoice |
| POST | `/api/invoices/{invoiceId}/payments` | Record payment; updates `amountPaid`, `balanceDue` and status (`partially_paid`/`paid`) |

## Stripe

See `docs/stripe-setup.md`. Disabled until `STRIPE_SECRET_KEY` is set, in which case the
checkout endpoint answers `503 STRIPE_NOT_CONFIGURED`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stripe/config` | Publishable key and whether Stripe is enabled on this server |
| POST | `/api/invoices/{id}/checkout-session` | Create a Stripe Checkout session for the invoice balance |
| GET | `/api/invoices/{id}/refunds` | List refunds recorded against the invoice |
| POST | `/api/invoices/{id}/refunds` | Refund the Stripe payment; omit `amount` to refund all that remains |
| POST | `/api/stripe/webhook` | Stripe event receiver. Public, authenticated by `Stripe-Signature`, exempt from rate limiting |

## Dashboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary` | Monthly invoiced/paid totals, outstanding/overdue amounts, counts, recent invoices and clients |

## Error format

```json
{
  "message": "Client not found",
  "code": "NOT_FOUND",
  "timestamp": "2026-06-10T12:00:00Z",
  "fields": {}
}
```

Codes: `VALIDATION_ERROR`, `BAD_REQUEST`, `NOT_FOUND`, `UNAUTHORIZED`,
`FORBIDDEN`, `CONFLICT`, `INTERNAL_ERROR`.

## Multi-tenancy

Every business resource belongs to a company. All queries are filtered by the
authenticated user's company (resolved from `company_members`); cross-tenant
access returns `404`.
