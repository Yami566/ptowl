-- Migration 0014 — Backfill all pending users to approved.
--
-- Why: the admin-approval gate at apps/api/src/routes/auth.ts:184 used
-- to default new clinic signups to status='pending'. New users were
-- routed to /pending and never reached the dashboard until an admin
-- approved them by clicking a one-shot email link. In practice this
-- broke first-login for at least one user (571-595-7661) — the dashboard
-- never appeared. New signups now auto-approve at the route level; this
-- migration unsticks anyone already stranded.
--
-- Safe to re-run: the UPDATE only touches rows still in 'pending'.
UPDATE users
SET status = 'approved',
    updated_at = datetime('now')
WHERE status = 'pending';
