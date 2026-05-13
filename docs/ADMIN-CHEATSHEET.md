# PTOwl Admin Cheat Sheet

> Plain-language steps for the things only the founder can do.
> No code. Just clicks. Access is gated by your Cloudflare account
> login (your `nurelimusabay@gmail.com`) — anyone without that login
> cannot see this stuff.
>
> **Bookmark this file** at https://github.com/Yami566/ptowl/blob/main/docs/ADMIN-CHEATSHEET.md so you can find it from any computer.

---

## 📋 Quick reference

| I want to…                                  | Section below                                    |
| ------------------------------------------- | ------------------------------------------------ |
| See all my users (who has signed up)        | [#1 List users](#1-list-all-users-who-signed-up) |
| Ban / disable a user                        | [#2 Disable a user](#2-disable-a-user)           |
| Re-enable a previously banned user          | [#3 Re-enable a user](#3-re-enable-a-user)       |
| See how many schedules / appointments exist | [#4 Counts](#4-quick-counts)                     |
| See website visitor numbers                 | [#5 Web Analytics](#5-website-visitor-analytics) |
| See server-side errors (something broke)    | [#6 Worker logs](#6-server-side-errors--logs)    |
| Roll back a bad deploy                      | [#7 Rollback](#7-rollback-a-bad-deploy)          |

---

## How to get to the admin tools (do this once)

The admin tools are inside your **Cloudflare account**. There's no separate "admin page" inside PTOwl — Cloudflare's built-in dashboard IS the admin page.

1. Open **https://dash.cloudflare.com** in your browser
2. Sign in with your Cloudflare email (probably `nurelimusabay@gmail.com`)
3. You should see your account home with sidebar items like "Workers & Pages", "Storage", "DNS", etc.

That's it. The rest of this doc tells you which sidebar item to click for each task.

---

## #1 List all users (who signed up)

**Goal:** see every clinic that has created an account.

1. Cloudflare dashboard left sidebar → **Storage & Databases** → **D1 SQL Database**
2. Click on **`ptowl-db`** (the production database)
3. Top tab → **Console** (this is a SQL prompt — like a search box for your data)
4. Paste this exact text into the box:
   ```sql
   SELECT email, status, role, tier, created_at FROM users ORDER BY created_at DESC LIMIT 50;
   ```
5. Click **Execute** (or press Ctrl+Enter)
6. The result appears below — every row is one user

**What you'll see:**

- `email` — their sign-in email
- `status` — should be `approved` for normal users. `denied` or `suspended` = banned.
- `role` — `clinic` for normal users
- `tier` — `free` during beta
- `created_at` — when they signed up

---

## #2 Disable a user

**Goal:** prevent a specific email from accessing PTOwl (e.g., spam signup, bad actor).

1. Same place as above (D1 → ptowl-db → Console)
2. Paste this — **replace `bad@example.com`** with the actual email you want to ban:
   ```sql
   UPDATE users SET status = 'denied' WHERE email = 'bad@example.com';
   ```
3. Click **Execute**
4. The result will say "1 row affected" — they're now banned

The next time they try to use PTOwl, the API will reject them with a `403 ACCOUNT_DISABLED` error. They can still sign in on the Clerk side, but every API call fails.

---

## #3 Re-enable a user

Same as above but flip the status back:

```sql
UPDATE users SET status = 'approved' WHERE email = 'bad@example.com';
```

---

## #4 Quick counts

**How many users have signed up?**

```sql
SELECT COUNT(*) FROM users;
```

**How many schedules have been generated?**

```sql
SELECT COUNT(*) FROM schedules;
```

**How many appointments?**

```sql
SELECT COUNT(*) FROM appointments;
```

**How many schedules per user (find your top users)?**

```sql
SELECT u.email, COUNT(s.id) AS schedules
FROM users u
LEFT JOIN schedules s ON s.user_id = u.id
GROUP BY u.email
ORDER BY schedules DESC
LIMIT 20;
```

---

## #5 Website visitor analytics

**Goal:** see how many people are visiting ptowl.com.

1. Cloudflare dashboard → **Web Analytics**
2. Click **`ptowl.com`** in the site list
3. You'll see pageviews, top pages, visitor countries, etc.
4. Data appears with ~5 minute delay

Web Analytics was enabled today (2026-05-13). If you don't see data yet, give it 5–10 minutes after a real visit.

---

## #6 Server-side errors / logs

**Goal:** see if something broke on the API side.

1. Cloudflare dashboard → **Workers & Pages**
2. Click **`ptowl-api`** (the API Worker, NOT `ptowl`)
3. Click **Logs** tab (or "Real-time logs")
4. Watch live as requests come in. Errors appear in red.

For older logs (more than ~24h ago), you'd need Logpush enabled. Not on yet — ask me to set it up if needed.

---

## #7 Rollback a bad deploy

**Goal:** undo a deploy that broke the site.

### Option A — fastest (60 sec): Cloudflare dashboard

1. Cloudflare dashboard → **Workers & Pages** → **`ptowl-api`**
2. Click **Deployments** tab
3. Find the version just BEFORE the bad one — click its three-dot menu (⋮)
4. Choose **"Roll back to this version"**
5. Confirm. Done — that version is live again.

Same procedure for the `ptowl` Worker if it's the frontend that broke.

### Option B — git revert (longer, but cleaner history)

1. https://github.com/Yami566/ptowl/commits/main → find the bad commit
2. Click on it → three dots → **"Revert"** → it opens a new PR
3. Merge that PR → deploy.yml automatically deploys the rollback

### Option C — terminal (when you have your laptop and time)

```sh
cd C:\Users\nurel\OneDrive\Documents\GitHub\ptowl\apps\api
npx wrangler rollback
```

---

## What can OTHER people do as admin?

Currently — **nothing**. Admin access = your Cloudflare account login. There's no "admin user role" inside PTOwl yet. If you want a friend to have admin powers, the simplest way is:

1. Add them as a collaborator on your Cloudflare account (CF dashboard → Members → Invite)
2. They share access to all your CF stuff (D1, Workers, etc.)
3. They can do everything on this cheat sheet

This is heavy access (they could delete the entire app). Only do this if you fully trust them.

A finer-grained "admin role inside PTOwl" would need new code (admin pages + a `role='admin'` check on protected endpoints). Not built yet. Ask me when you're ready.

---

## 🆘 Emergency: "the site is down, what do I do?"

1. **Check ptowl.com loads** — `curl -sI https://ptowl.com/` should return `200 OK`
2. **Check the Worker is alive** — Cloudflare dashboard → Workers & Pages → `ptowl-api` → Metrics. If errors spike, something's broken.
3. **Roll back** — section #7 above. Always pick the deploy just before the spike started.
4. **Check Clerk** — `https://clerk.ptowl.com/v1/environment` should return JSON. If it returns 500, Clerk is having problems (not your fault).
5. **Last resort** — message me on Claude with "PTOwl is down, what do I do" and I'll walk you through.

---

_Bookmark this doc. Future-you will thank you._ 🦉
