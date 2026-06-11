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
MAIL_PROVIDER=resend
MAIL_FROM=MyVision <no-reply@myvision.visionbau.de>
RESEND_API_KEY
STORAGE_PROVIDER=supabase
SUPABASE_URL=https://toyrbakpcbcishmaulbg.supabase.co
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_DOCUMENTS_BUCKET=myvision-documents
SUPABASE_PUBLIC_BUCKET=myvision-public
```

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
- Alert on repeated `INTERNAL_ERROR`, auth failures, and storage/email provider failures.
- Keep database backups and Supabase point-in-time recovery settings aligned with the paid plan before real customer data.
