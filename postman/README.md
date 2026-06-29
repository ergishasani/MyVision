# MyVision API — Postman collection

Ready-to-import requests for the MyVision Spring Boot backend (`http://localhost:8080`).
Covers every endpoint: **46 requests across 11 folders**.

## Files

- `MyVision.postman_collection.json` — the requests, grouped by resource.
- `MyVision.local.postman_environment.json` — the `MyVision Local` environment (base URL + variables that get filled in automatically as you run).

## Start the backend first

```bash
docker compose up -d --build      # from the repo root
curl http://localhost:8080/api/health   # -> {"status":"ok",...}
```

## Import & run

1. In Postman: **Import** → drop both JSON files in.
2. Top-right environment selector → choose **MyVision Local**.
3. Run **Auth → Register** once (or use the **Collection Runner** on the whole collection, top to bottom).
   - `Register` generates a unique email each run and stores the access token, refresh token and ids into the environment, so every later request is authenticated automatically.
4. Or run everything at once: **… on the collection → Run** → Run MyVision API.

The collection-level auth is `Bearer {{token}}`; the public `POST /api/auth/**` endpoints override it to no-auth.

## Folder order matters

The folders are ordered so a full top-to-bottom run is self-contained: it creates a client → project → quote → invoice → payment, then cleans them up at the end. Running the **Collection Runner** in order gives a green run (verified with Newman: 46/46 requests, 49/49 assertions).

```bash
# optional: run headless with Newman
npx newman run postman/MyVision.postman_collection.json \
  -e postman/MyVision.local.postman_environment.json
```

## Expected non-2xx responses (these are correct, not failures)

| Request | Status | Why |
|---|---|---|
| Auth → Reset password / Verify email | 400 | Placeholder token. With `MAIL_PROVIDER=log` the real token is printed in the API container logs — paste it into `{{resetToken}}` / `{{verifyToken}}`. |
| Auth → Login with Google / Apple | 400 | Needs a real Google `idToken` / Apple `identityToken` in the env vars. |
| Quotes → Reject quote | 400 | The run already accepted the quote; rejecting an accepted quote is an invalid transition. |
| Invoice status → Cancel invoice | 400 | The run already marked the invoice paid; a paid invoice can't be cancelled. |
| Invoices → Get ZUGFeRD PDF | 501 | Intentionally not implemented (needs PDF/A-3 + validator certification). |
| Company → Upload company logo | 400 | No file attached. Select a PNG/JPEG/WEBP/SVG (< 2 MB) for the `file` form field, then it returns 200. |

Everything else returns 200/201/204.

## Variables

`baseUrl` is the only one you set by hand (defaults to `http://localhost:8080`). The rest —
`token`, `refreshToken`, `userId`, `companyId`, `clientId`, `projectId`, `quoteId`,
`invoiceId`, `paymentId`, `userEmail`, `userPassword` — are captured automatically by the
test scripts as you run the requests.
