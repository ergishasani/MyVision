# Supabase Backup And Restore Checklist

## Before Real Customers

- Confirm the Supabase project is on a plan with the backup/PITR capability you need.
- Confirm backup retention meets your business risk requirements.
- Document who can access the Supabase dashboard and service-role key.
- Keep the database password and service-role key in the hosting provider secret store only.

## Weekly Operational Check

- Confirm recent backups exist in Supabase.
- Confirm storage buckets exist:
  - `myvision-documents`, private.
  - `myvision-public`, public-read.
- Confirm no service-role key is present in frontend env vars.

## Restore Drill

Run this before launch and after major schema changes:

1. Create a temporary Supabase branch or restore target.
2. Restore from the chosen backup point.
3. Run backend migrations.
4. Start the backend against the restored database.
5. Verify `/actuator/health`.
6. Verify login, invoice list, PDF generation, and XRechnung export on restored data.
7. Delete the temporary restore target after the drill.

## Incident Notes

- Rotate `SUPABASE_SERVICE_ROLE_KEY` immediately if it is exposed.
- Rotate database credentials if a backend host or logs leak secrets.
- Keep a written timeline for customer-impacting data incidents.
