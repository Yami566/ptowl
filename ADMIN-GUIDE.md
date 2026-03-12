# PTOWL Admin & Management Guide

## Your Credentials

### Production Admin Login
- **URL:** https://ptowl.com
- **Email:** help@ptowl.com
- **Password:** PtOwl-Admin-2026!
- **Role:** Admin (approved, paid tier)

> IMPORTANT: Change this password after your first login via the Profile page.

### Admin Panel Access
1. Go to https://ptowl.com
2. Log in with the credentials above
3. Click "Admin" in the navigation (only visible to admin accounts)
4. You'll need to verify via email 2FA code sent to help@ptowl.com
5. After verification, you can approve/deny new user registrations

---

## Where Everything Lives

### Cloudflare Dashboard
**URL:** https://dash.cloudflare.com

| Service | Where to Find It | What It Does |
|---------|------------------|--------------|
| **Pages** (Frontend) | Workers & Pages > ptowl | Hosts the React app at ptowl.com |
| **Workers** (API) | Workers & Pages > ptowl-api | Runs the backend API at ptowl.com/api/* |
| **D1 Database** | Workers & Pages > D1 > ptowl-db | Stores all user data, schedules, templates |
| **Turnstile** | Security > Turnstile | Bot protection on login/register forms |
| **DNS** | ptowl.com > DNS | Domain routing for ptowl.com |

### Third-Party Services

| Service | URL | What It Does |
|---------|-----|--------------|
| **Resend** | https://resend.com/dashboard | Sends password reset emails & admin 2FA codes |
| **Google Workspace** | https://admin.google.com | Your help@ptowl.com inbox |
| **Cloudflare Registrar** | Cloudflare Dashboard > Domain Registration | Domain registration for ptowl.com |

---

## How to Manage Each Feature

### 1. Approve/Deny New Users
1. Log in at https://ptowl.com
2. Go to Admin panel (requires email 2FA)
3. See pending users in the table
4. Click Approve or Deny for each

### 2. View/Query the Database
**Option A: Cloudflare Dashboard**
- Go to Workers & Pages > D1 > ptowl-db > Console
- Run SQL queries directly (SELECT, UPDATE, etc.)

**Option B: Command Line (from your project folder)**
```bash
# List all users
npx wrangler d1 execute ptowl-db --remote --command "SELECT id, email, role, status, tier, created_at FROM users;"

# List all schedules
npx wrangler d1 execute ptowl-db --remote --command "SELECT id, patient_alias, start_date, end_date FROM schedules LIMIT 20;"

# Count active users
npx wrangler d1 execute ptowl-db --remote --command "SELECT COUNT(*) as total FROM users WHERE status = 'approved';"
```

### 3. Change User Roles or Status
```bash
# Promote a user to admin
npx wrangler d1 execute ptowl-db --remote --command "UPDATE users SET role = 'admin' WHERE email = 'someone@example.com';"

# Suspend a user
npx wrangler d1 execute ptowl-db --remote --command "UPDATE users SET status = 'suspended' WHERE email = 'bad@example.com';"

# Upgrade a user to paid tier
npx wrangler d1 execute ptowl-db --remote --command "UPDATE users SET tier = 'paid' WHERE email = 'customer@example.com';"
```

### 4. Manage Secrets (API Keys, Passwords)
```bash
# Rotate JWT secret (logs everyone out)
echo "NEW_SECRET_HERE" | npx wrangler secret put JWT_SECRET

# Update Resend API key
echo "re_NEW_KEY" | npx wrangler secret put EMAIL_API_KEY

# Update Turnstile secret
echo "0xNEW_KEY" | npx wrangler secret put TURNSTILE_SECRET_KEY

# Update admin email
echo "new@ptowl.com" | npx wrangler secret put ADMIN_EMAIL
```

### 5. Deploy Code Updates
```bash
# From the project root (C:\Users\nurel\OneDrive\Desktop\ptowl)

# Run tests first
pnpm test

# Build everything
pnpm build

# Deploy API
cd apps/api && npx wrangler deploy

# Deploy Frontend
cd apps/web && npx wrangler pages deploy dist --project-name ptowl
```

### 6. Run Database Migrations (Schema Changes)
```bash
# Create a new migration file in apps/api/src/migrations/
# Name it: 0004_description.sql

# Apply to production
cd apps/api && npx wrangler d1 migrations apply ptowl-db --remote
```

### 7. Monitor & Debug
```bash
# Live API logs (real-time)
npx wrangler tail ptowl-api

# Check D1 database size
npx wrangler d1 info ptowl-db

# View recent deployments
npx wrangler deployments list
```

### 8. Turnstile (Bot Protection)
1. Go to Cloudflare Dashboard > Security > Turnstile
2. Click your widget
3. **Add hostname:** Make sure `ptowl.com` is listed
4. You can see analytics (challenges served, passes, failures)

### 9. Email Service (Resend)
1. Go to https://resend.com/dashboard
2. **Emails tab:** See all sent emails (password resets, 2FA codes)
3. **Domains tab:** Verify ptowl.com domain is active (green checkmark)
4. **API Keys tab:** Rotate keys if compromised
5. **Free tier:** 100 emails/day, 3,000/month (plenty for early stage)

### 10. Custom Domain & DNS
1. Go to Cloudflare Dashboard > ptowl.com > DNS
2. Current setup:
   - `ptowl.com` → Cloudflare Pages (frontend)
   - `www.ptowl.com` → Cloudflare Pages (frontend)
   - `ptowl.com/api/*` → Cloudflare Workers (API)

---

## Security Checklist

### After First Login
- [ ] Change the admin password (Profile page)
- [ ] Verify Turnstile widget has `ptowl.com` as allowed hostname
- [ ] Check Resend domain verification is green
- [ ] Test a password reset email actually arrives

### Monthly
- [ ] Check Cloudflare Analytics for unusual traffic
- [ ] Review Turnstile challenge stats
- [ ] Check D1 database size (free tier: 5GB)
- [ ] Review audit_log table for suspicious activity

### If Compromised
1. Rotate JWT_SECRET immediately (logs all users out)
2. Rotate EMAIL_API_KEY in Resend dashboard + wrangler
3. Rotate TURNSTILE_SECRET_KEY in Cloudflare + wrangler
4. Suspend compromised user accounts via D1
5. Check audit_log for attacker activity

---

## Cloudflare Free Tier Limits

| Resource | Free Limit | PTOWL Usage |
|----------|-----------|-------------|
| Workers requests | 100,000/day | Plenty for early stage |
| D1 storage | 5 GB | ~50,000+ users worth |
| D1 reads | 5M/day | Plenty |
| D1 writes | 100K/day | Plenty |
| Pages deployments | 500/month | Plenty |
| Resend emails | 100/day, 3K/month | Plenty |

---

## Quick Reference Commands

```bash
# ---- From project root: C:\Users\nurel\OneDrive\Desktop\ptowl ----

# Run all tests
pnpm test

# Build everything
pnpm build

# Start local dev (API + Web)
cd apps/api && npx wrangler dev &
cd apps/web && pnpm dev

# Deploy API to production
cd apps/api && npx wrangler deploy

# Deploy Frontend to production
cd apps/web && npx wrangler pages deploy dist --project-name ptowl

# Live API logs
cd apps/api && npx wrangler tail ptowl-api

# Query production database
cd apps/api && npx wrangler d1 execute ptowl-db --remote --command "YOUR SQL HERE"

# Apply new migrations
cd apps/api && npx wrangler d1 migrations apply ptowl-db --remote
```
