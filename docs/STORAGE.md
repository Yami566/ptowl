# Storage — Cloudflare R2 for clinic logos

Clinic logos live in **Cloudflare R2** (object storage, S3-compatible).
Replaces the legacy "base64 data URL stored in `profiles.logo_url`" approach
which bloated D1 rows.

## What's wired up

- `apps/api/wrangler.jsonc` declares the `LOGOS` R2 binding for both
  production (`ptowl-logos`) and staging (`ptowl-logos-staging`).
- `apps/api/src/types/env.ts` exposes `LOGOS?: R2Bucket` (optional —
  code falls back to base64 if the binding isn't present).
- Migration `0011_profile_logo_r2.sql` adds `profiles.logo_r2_key`.
- `POST /api/v1/profile/logo` (in `routes/profile.ts`) decodes the
  uploaded base64 once, validates magic bytes, then **dual-writes**:
  binary → R2 at `logos/{userId}/clinic.{png|jpg}`, and the existing
  base64 → `profiles.logo_url`. The R2 key is recorded in
  `profiles.logo_r2_key` so future code can prefer R2 over base64.

This is a deliberate **dual-write phase** — every existing logo display
path keeps working unchanged because `logo_url` is still populated. New
uploads simultaneously land in R2.

## One-time setup (you do this in Cloudflare dashboard or CLI)

```bash
# Create the buckets
wrangler r2 bucket create ptowl-logos
wrangler r2 bucket create ptowl-logos-staging

# Apply the migration to D1
pnpm --filter @ptowl/api db:migrate:remote
```

After bucket creation + deploy, new logo uploads will start landing in
R2 automatically.

## Future cleanup

When all active clinics have re-uploaded under the new code:

1. Add a public GET endpoint `/api/v1/logos/:userId` that streams the
   R2 object (or signs a URL via R2's S3-compatible API).
2. Update `apps/web/src/pages/ProfilePage.tsx` and any other display
   site to fetch from that endpoint instead of consuming the embedded
   base64 data URL.
3. Add a backfill cron that copies remaining base64 logos into R2.
4. New migration: drop `profiles.logo_url`.

## Why dual-write instead of full migration

Because the user creating the bucket and running the migration is a
manual step. Until that's done, the R2 binding might be missing in
production — the optional `c.env.LOGOS` check makes the upload route
gracefully fall back to base64 only. No production breakage during the
rollout window.
