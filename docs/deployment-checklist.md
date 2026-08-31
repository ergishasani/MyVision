# Deployment Checklist

## Backend Hosting

- Build from `engine/Dockerfile`.
- Expose `SERVER_PORT=8080` or map the platform port to 8080.
- Health check: `GET /actuator/health`.
- API docs should be disabled or protected before public launch if you do not want `/docs` public.

## Required Backend Environment

```txt
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
JWT_SECRET
AUTH_FRONTEND_BASE_URL=https://myvision.visionbau24.de
APP_CORS_ALLOWED_ORIGINS=https://myvision.visionbau24.de
AUTH_RETURN_SENSITIVE_TOKENS=false
APP_RATE_LIMIT_ENABLED=true
APP_RATE_LIMIT_MAX_REQUESTS=120
APP_RATE_LIMIT_WINDOW_MS=60000
SPRINGDOC_ENABLED=false
SPRINGDOC_SWAGGER_UI_ENABLED=false
SPRINGDOC_API_DOCS_ENABLED=false
MAIL_PROVIDER=resend
MAIL_FROM=MyVision <no-reply@myvision.visionbau24.de>
RESEND_API_KEY
```

## Secrets You Must Create Or Copy

- `JWT_SECRET`: generate a long random value, at least 32 bytes.
- `DATABASE_PASSWORD`: PostgreSQL password.
- `RESEND_API_KEY`: Resend API key with send-email permission.
- Hosting deploy token or project credentials, depending on the hosting provider.

Never put these in frontend env vars, source code, Git, screenshots, or chat logs.

## Resend Domain Verification

- Add and verify the sending domain in Resend, preferably `myvision.visionbau24.de` or `mail.myvision.visionbau24.de`.
- Add the DNS records Resend gives you: SPF/TXT, DKIM, and any return-path/bounce records.
- Wait until Resend marks the domain verified.
- Send a real password-reset email from staging and confirm the link points to `AUTH_FRONTEND_BASE_URL`.
- Send a real email-verification email from staging and confirm delivery, sender identity, and spam placement.

## Frontend Hosting

- Point `NEXT_PUBLIC_API_URL` to the deployed backend `/api` base URL.
- Serve only over HTTPS.

## File Storage

- Mount a persistent volume at `STORAGE_LOCAL_ROOT`. On ephemeral container storage every
  generated invoice PDF and XRechnung XML is lost on restart.
- Invoices and e-invoice exports are private: they are streamed through the API, never served
  directly from disk.
- Logos are the only public-read assets, served from `STORAGE_PUBLIC_BASE_URL`.

## Monitoring

- Monitor `/actuator/health`.
- Capture backend logs from the hosting platform.
- Ensure logs include `requestId` from the `X-Request-Id` response header.
- Alert on repeated `INTERNAL_ERROR`, auth failures, and storage/email provider failures.
- Back up PostgreSQL and the storage volume together. A database restore without the matching
  documents leaves invoices pointing at files that no longer exist.
