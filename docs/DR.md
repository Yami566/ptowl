# Disaster Recovery Runbook

## Database (Cloudflare D1)

D1 ships with **30-day point-in-time recovery** out of the box (no extra
cost, no code to write). Every D1 database can be rolled back to any
moment within the past 30 days using the Time Travel feature.

### When to use this

- Bad migration ran against `--remote` and corrupted rows
- Mass-delete from a buggy admin action
- Restore the previous state to investigate a bug report

### How to restore

The `wrangler d1 time-travel` family of commands operates against the
production D1 binding declared in `apps/api/wrangler.jsonc`.

#### 1. Find the bookmark you want

A bookmark is an opaque cursor that names a point in time. Get the most
recent bookmark, or one near a specific timestamp:

```bash
# Most recent bookmark
wrangler d1 time-travel info ptowl-db

# Bookmark closest to a wall-clock timestamp (Unix seconds or ISO 8601)
wrangler d1 time-travel info ptowl-db --timestamp=2025-04-25T14:00:00Z
```

#### 2. Inspect the state at that bookmark (no rollback)

You can run read-only SQL against any past bookmark without modifying
the live database:

```bash
wrangler d1 time-travel restore ptowl-db --bookmark=<bookmark> --read-only
```

#### 3. Rollback to that bookmark

> This is destructive. The current state of the database is replaced
> with the state at the bookmark. **Take a fresh export first.**

```bash
# (Optional but recommended) Export current state before rollback
wrangler d1 export ptowl-db --remote --output=./backup-$(date +%Y%m%d-%H%M%S).sql

# Restore
wrangler d1 time-travel restore ptowl-db --bookmark=<bookmark>
```

The Worker continues serving traffic during the restore. Connections
seamlessly switch to the restored state.

### What's covered

- All tables in the production D1 database (`ptowl-db`)
- Schema and data — no separate snapshots needed

### What's NOT covered

- **R2 logo uploads** — R2 has versioning, but objects are not
  point-in-time recoverable. Re-upload from the source-of-truth (the
  user's profile page) if anything is lost.
- **Cloudflare Pages content** — re-run the deploy workflow on `main`
  to redeploy any version.
- **Secrets/Bindings** — `wrangler secret list`/`put` to verify and
  re-set if rotated.

## Worker rollback

Cloudflare keeps the previous N Worker deploys. Roll back through:

- Dashboard: Workers & Pages → ptowl-api → Deployments → "Rollback"
- CLI: `wrangler deployments list` then `wrangler rollback <id>`

## Frontend rollback

Cloudflare Pages keeps every deployment. Roll back through:

- Dashboard: Workers & Pages → ptowl → Deployments → "Rollback"

This serves the previous build immediately; re-running the deploy
workflow against an older commit reaches the same outcome.

## Recovery time targets

| Scenario                      | RTO                            | RPO              |
| ----------------------------- | ------------------------------ | ---------------- |
| Worker bad deploy             | < 5 min (rollback button)      | 0 (no data lost) |
| Pages bad deploy              | < 5 min (rollback button)      | 0 (no data lost) |
| D1 corruption / bad migration | < 15 min (Time Travel restore) | 30 days max      |
| R2 object loss                | depends on re-upload           | n/a              |

## Smoke check after recovery

After any restore:

```bash
curl -fsS https://api.ptowl.com/api/v1/health
```

Expect `{ "ok": true, "data": { "status": "healthy", "db": { "connected": true, ... } } }`.
