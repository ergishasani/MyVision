# Production Readiness

This project now includes the code foundations for production authentication and auditability.

## Implemented

- Access tokens with expiry.
- Refresh tokens stored as SHA-256 hashes.
- Refresh-token rotation on `/api/auth/refresh`.
- Logout refresh-token revocation.
- Login/register/password-reset rate limiting.
- Password reset token storage.
- Email verification token storage.
- Audit logs for invoice creation, invoice status changes, invoice updates, and payment creation.
- GitHub Actions CI for backend and frontend.
- Supabase/Flyway migration parity.

## Provider-Dependent Work

These are not safe to mark fully complete until providers and legal rules are chosen:

- Email delivery for password reset and email verification.
- Production file storage for generated PDFs and company logos.
- Country-specific VAT and invoice compliance review.
- Structured e-invoice exports such as XRechnung/ZUGFeRD.

## Environment Variables

Required production variables:

```txt
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
JWT_SECRET
AUTH_REFRESH_TOKEN_EXPIRATION_MS
AUTH_PASSWORD_RESET_EXPIRATION_MS
AUTH_EMAIL_VERIFICATION_EXPIRATION_MS
AUTH_RETURN_SENSITIVE_TOKENS=false
AUTH_RATE_LIMIT_MAX_ATTEMPTS
AUTH_RATE_LIMIT_WINDOW_MS
NEXT_PUBLIC_API_URL
```

Never enable `AUTH_RETURN_SENSITIVE_TOKENS` in production. It exists only for local development before email delivery is configured.

