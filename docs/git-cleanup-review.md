# Git Cleanup Review

## Include For Backend/Provider Work

- `apps/api/**`
- `docs/deployment-checklist.md`
- `docs/e-invoice-validation.md`
- `docs/invoice-compliance-checklist.md`
- `docs/provider-and-compliance-decisions.md`
- `docs/production-readiness.md`
- `supabase/migrations/20260611140500_storage_buckets_for_documents_and_logos.sql`
- `.env.example`
- `.gitignore`
- `docker-compose.yml`
- `README.md`

## Review Separately

- `apps/web/**`
- `package.json`

These frontend/workspace changes existed outside this backend-only pass. Review them before staging if you want a clean backend/provider commit.

## Optional Generated Files

- `graphify-out/GRAPH_REPORT.md`
- `graphify-out/graph.html`
- `graphify-out/graph.json`
- `graphify-out/manifest.json`
- `graphify-out/.graphify_labels.json`
- `graphify-out/cache/stat-index.json`

These were updated by `graphify update`. Include them only if you want the repository graph artifact committed with the backend changes.
