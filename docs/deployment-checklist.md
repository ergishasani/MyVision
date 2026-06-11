# Deployment Checklist

## Backend Hosting

- Build from `apps/api/Dockerfile`.
- Expose `SERVER_PORT=8080` or map the platform port to 8080.
- Health check: `GET /actuator/health`.
- API docs should be disabled or protected before public launch if you do not want `/docs` public.

## Required Backend Environment

```txt
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
JWT_SECRET
AUTH_FRONTEND_BASE_URL=https://myvision.visionbau.de
APP_CORS_ALLOWED_ORIGINS=https://myvision.visionbau.de
AUTH_RETURN_SENSITIVE_TOKENS=false
APP_RATE_LIMIT_ENABLED=true
APP_RATE_LIMIT_MAX_REQUESTS=120
APP_RATE_LIMIT_WINDOW_MS=60000
SPRINGDOC_ENABLED=false
SPRINGDOC_SWAGGER_UI_ENABLED=false
SPRINGDOC_API_DOCS_ENABLED=false
MAIL_PROVIDER=resend
MAIL_FROM=MyVision <no-reply@myvision.visionbau.de>
RESEND_API_KEY
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://toyrbakpcbcishmaulbg.supabase.co
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DOCUMENTS_BUCKET=myvision-documents
SUPABASE_PUBLIC_BUCKET=myvision-public
```

## Secrets You Must Create Or Copy

- `JWT_SECRET`: generate a long random value, at least 32 bytes.
- `DATABASE_PASSWORD`: Supabase database password.
- `RESEND_API_KEY`: Resend API key with send-email permission.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key, backend only.
- Hosting deploy token or project credentials, depending on the hosting provider.

Never put these in frontend env vars, source code, Git, screenshots, or chat logs.

## Resend Domain Verification

- Add and verify the sending domain in Resend, preferably `myvision.visionbau.de` or `mail.myvision.visionbau.de`.
- Add the DNS records Resend gives you: SPF/TXT, DKIM, and any return-path/bounce records.
- Wait until Resend marks the domain verified.
- Send a real password-reset email from staging and confirm the link points to `AUTH_FRONTEND_BASE_URL`.
- Send a real email-verification email from staging and confirm delivery, sender identity, and spam placement.

## Frontend Hosting

- Point `NEXT_PUBLIC_API_URL` to the deployed backend `/api` base URL.
- Point `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the production Supabase project.
- Serve only over HTTPS.

## Supabase

- `myvision-documents` is private and intended for invoices/e-invoice exports.
- `myvision-public` is public-read and intended for logos and other non-sensitive assets.
- Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend.

## Monitoring

- Monitor `/actuator/health`.
- Capture backend logs from the hosting platform.
- Ensure logs include `requestId` from the `X-Request-Id` response header.
- Alert on repeated `INTERNAL_ERROR`, auth failures, and storage/email provider failures.
- Keep database backups and Supabase point-in-time recovery settings aligned with the paid plan before real customer data.
