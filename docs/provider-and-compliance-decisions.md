# Provider and Compliance Decisions

MyVision is Germany-first for invoicing and e-invoicing.

## Current Decisions

- Email provider: Resend.
- File storage: local filesystem under `storage.local-root`. In a container this must be a mounted volume.
- PDF format: backend-generated invoice PDF.
- E-invoice target: XRechnung XML first, ZUGFeRD/PDF-A-3 later.
- Legal scope: engineering support only; final VAT/e-invoice compliance must be reviewed by a qualified German tax/compliance expert.

## Required Secrets

```txt
RESEND_API_KEY
MAIL_FROM
MAIL_PROVIDER=resend
AUTH_FRONTEND_BASE_URL
STORAGE_PUBLIC_BASE_URL
```

## Implemented Backend Routes

```txt
POST /api/auth/register
POST /api/auth/forgot-password
GET  /api/invoices/{id}/pdf
POST /api/invoices/{id}/pdf
GET  /api/invoices/{id}/xrechnung
POST /api/invoices/{id}/xrechnung
GET  /api/invoices/{id}/zugferd
POST /api/company/logo
```

Register sends the email-verification link through the configured provider.
Forgot password sends the password-reset link through the configured provider.
The `GET` document routes stream generated files directly.
The `POST` document routes generate and store the file in the configured storage provider.
The ZUGFeRD route returns `501 NOT_IMPLEMENTED` until PDF/A-3 embedding and validator support are implemented.

## Germany E-Invoicing Notes

- Germany is moving progressively toward mandatory B2B e-invoicing.
- Companies must be able to receive EN 16931-compliant e-invoices from 1 January 2025.
- Issuing obligations phase in from 2027 for larger businesses and 2028 for all businesses.
- XRechnung is the German standard/CIUS for electronic invoicing with public authorities.
- ZUGFeRD combines a human-readable PDF with embedded machine-readable XML and is relevant later, but true ZUGFeRD requires PDF/A-3 attachment handling.

## Implementation Order

1. Email service abstraction.
2. Resend HTTP implementation.
3. Password-reset and email-verification emails.
4. Storage service abstraction.
5. Filesystem storage for logos and generated documents.
6. Invoice/quote PDF template.
7. PDF generation endpoints.
8. XRechnung XML export endpoint.
9. XRechnung validator integration.
10. ZUGFeRD/PDF-A-3 support.

## Not Yet Done

- Real email provider credentials still need to be set in production hosting.
- Production file storage needs a persistent volume mounted at `STORAGE_LOCAL_ROOT`.
- PDF template is functional but not brand-final.
- XRechnung XML export exists, but must be tested with a validator before real e-invoice sending.
- ZUGFeRD needs a PDF/A-3 capable library and validation workflow.
