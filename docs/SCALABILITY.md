# PTOWL Scalability Analysis

**Document Version:** 1.0
**Last Updated:** 2026-03-16
**Author:** PTOWL Development Team
**Status:** Partially superseded — see banner below

> **⚠️ Doc-status note (May 5, 2026):** Performance numbers and
> bottleneck analyses tied to /admin endpoints (e.g., `/admin/users`
> full-table scan) describe routes that no longer exist (admin
> console removed in post-hotfix cleanup). Firebase SDK bundle-size
> figures are also stale (Firebase has been removed; current bundle
> is ~660KB without it).
>
> **Still load-bearing in this doc:** the D1 query patterns, Workers
> execution model, KV/R2 caching strategy, and the trade-off
> framework for "shadow vs. cluster" scaling. Use those sections
> with confidence; treat the specific endpoint/numbers as a snapshot
> of the March-2026 stack.

---

## 1. Executive Summary

This document models how PTOWL's Cloudflare-based architecture performs at three user tiers (100, 1,000, 10,000+), identifies breaking points, and provides remediation plans for each threshold. The analysis is based on actual codebase inspection, Cloudflare free tier limits, and estimated usage patterns.

**Key Finding:** The current architecture handles 100 users with 99%+ headroom on all resources. At 1,000 users, email limits and admin page performance become bottlenecks. At 10,000+ users, the Worker free tier is exceeded and multiple systems require paid upgrades totaling ~$125/month.

---

## 2. Usage Model Assumptions

### Per-User Daily Activity (Average)

| Action             | API Calls | D1 Reads | D1 Writes              |
| ------------------ | --------- | -------- | ---------------------- |
| Login (once/day)   | 1         | 3        | 0                      |
| View dashboard     | 1         | 2        | 0                      |
| Create schedule    | 1         | 4        | N+1 (N = appointments) |
| View 3 schedules   | 3         | 6        | 0                      |
| Edit 1 appointment | 1         | 2        | 1                      |
| Refresh token (2x) | 2         | 2        | 0                      |
| **Daily Total**    | **~9**    | **~19**  | **~18**                |

### Registration (One-Time)

| Action                      | API Calls | D1 Queries                                                                                                  |
| --------------------------- | --------- | ----------------------------------------------------------------------------------------------------------- |
| Firebase auth + create user | 1         | 11 (OAuth lookup, email check, user INSERT, profile INSERT, 5x template INSERT, OAuth INSERT, audit INSERT) |
| Admin notification email    | 0         | 0 (fire-and-forget)                                                                                         |

---

## 3. Tier 1: 100 Users — GREEN

### Resource Utilization

| Resource            | Daily Usage  | Free Tier Limit | Utilization | Status |
| ------------------- | ------------ | --------------- | ----------- | ------ |
| Worker Requests     | ~900         | 100,000         | 0.9%        | OK     |
| D1 Row Reads        | ~1,900       | 5,000,000       | 0.04%       | OK     |
| D1 Row Writes       | ~1,800       | 100,000         | 1.8%        | OK     |
| D1 Storage          | <1 MB        | 5 GB            | 0.02%       | OK     |
| Worker CPU          | <5ms avg     | 50ms/req        | 10%         | OK     |
| Worker Memory       | ~5 MB        | 128 MB          | 4%          | OK     |
| Rate Limiter Memory | ~500 entries | 128 MB          | <0.01%      | OK     |
| Resend Emails       | ~5/day       | 100/day         | 5%          | OK     |

### Data Volume Estimate

| Table        | Rows       | Size        |
| ------------ | ---------- | ----------- |
| users        | 100        | ~10 KB      |
| profiles     | 100        | ~15 KB      |
| templates    | 500        | ~25 KB      |
| schedules    | 300        | ~30 KB      |
| appointments | 4,800      | ~300 KB     |
| audit_log    | 500        | ~30 KB      |
| **Total**    | **~6,300** | **~410 KB** |

### Performance Characteristics

- API response time: <50ms P95
- Schedule creation: <200ms (4 + 16 queries avg)
- Dashboard load: <100ms API + ~500ms frontend render
- Admin user list: <50ms (100 rows)

### Verdict

All systems nominal. No action needed. Cloudflare free tier has 99%+ headroom across all resources.

---

## 4. Tier 2: 1,000 Users — YELLOW

### Resource Utilization

| Resource            | Daily Usage    | Free Tier Limit | Utilization | Status |
| ------------------- | -------------- | --------------- | ----------- | ------ |
| Worker Requests     | ~9,000         | 100,000         | 9%          | OK     |
| D1 Row Reads        | ~19,000        | 5,000,000       | 0.4%        | OK     |
| D1 Row Writes       | ~18,000        | 100,000         | 18%         | OK     |
| D1 Storage          | ~5 MB          | 5 GB            | 0.1%        | OK     |
| Worker CPU          | <5ms avg       | 50ms/req        | 10%         | OK     |
| Worker Memory       | ~15 MB         | 128 MB          | 12%         | OK     |
| Rate Limiter Memory | ~5,000 entries | 128 MB          | <0.1%       | OK     |
| Resend Emails       | ~50/day        | 100/day         | **50%**     | WATCH  |

### Identified Bottlenecks

#### 1. Email Rate Limit Approaching

**Impact:** At 50+ new registrations/day, admin notification + approval emails approach Resend's free tier of 100/day.
**Threshold:** Exceeded at ~33 registrations/day (3 emails per registration: admin notify, approval email, welcome email).
**Remediation:** Upgrade to Resend Pro ($20/month, 50K emails/month).

#### 2. Admin Users List — No Pagination

**Impact:** `GET /api/v1/admin/users` fetches ALL users with no LIMIT clause.
**Current Query:** `SELECT id, email, display_name, status, role, tier, created_at FROM users ORDER BY created_at DESC`
**At 1K users:** Response payload ~150KB, query time ~200ms. Noticeable but usable.
**Remediation:** Add pagination (page + limit params, LIMIT/OFFSET in SQL).

#### 3. Registration Query Count

**Impact:** 11 queries per new Firebase registration is inefficient. At 50 signups/day = 550 queries just for registration.
**Remediation:** Batch the 5 template INSERTs into 1 multi-row INSERT.

### Data Volume Estimate

| Table        | Rows        | Size        |
| ------------ | ----------- | ----------- |
| users        | 1,000       | ~100 KB     |
| profiles     | 1,000       | ~150 KB     |
| templates    | 5,000       | ~250 KB     |
| schedules    | 3,000       | ~300 KB     |
| appointments | 48,000      | ~3 MB       |
| audit_log    | 5,000       | ~300 KB     |
| **Total**    | **~63,000** | **~4.1 MB** |

### Cost Impact

| Service    | Action          | Cost          |
| ---------- | --------------- | ------------- |
| Resend     | Upgrade to Pro  | $20/month     |
| Cloudflare | Still free tier | $0            |
| **Total**  |                 | **$20/month** |

---

## 5. Tier 3: 10,000+ Users — RED

### Resource Utilization

| Resource            | Daily Usage     | Free Tier Limit | Utilization | Status   |
| ------------------- | --------------- | --------------- | ----------- | -------- |
| Worker Requests     | ~90,000         | 100,000         | **90%**     | DANGER   |
| D1 Row Reads        | ~190,000        | 5,000,000       | 3.8%        | OK       |
| D1 Row Writes       | ~180,000        | 100,000         | **180%**    | EXCEEDED |
| D1 Storage          | ~50 MB          | 5 GB            | 1%          | OK       |
| Worker CPU          | <5ms avg        | 50ms/req        | 10%         | OK       |
| Worker Memory       | ~50 MB          | 128 MB          | 39%         | WATCH    |
| Rate Limiter Memory | ~50,000 entries | 128 MB          | **~30%**    | WATCH    |
| Resend Emails       | ~500/day        | 100/day         | **500%**    | EXCEEDED |

### Breaking Points

#### 1. Worker Request Limit EXCEEDED

**Impact:** At ~90K requests/day, the Worker free tier (100K/day) is nearly exhausted. Spikes will cause 429 errors from Cloudflare.
**Remediation:** Upgrade to Workers Paid ($5/month, 10M requests/month = 333K/day).

#### 2. D1 Write Limit EXCEEDED

**Impact:** At ~180K writes/day, the free tier (100K/day) is exceeded by 80%.
**Remediation:** Upgrade to D1 paid tier. Pricing: $0.75 per million rows written.
**Monthly cost estimate:** 180K × 30 = 5.4M writes/month × $0.75/M = ~$4/month.

#### 3. Email Limit EXCEEDED (5x)

**Impact:** 500 emails/day vs 100/day free tier. Registration emails, approval emails, and 2FA codes all count.
**Remediation:** Upgrade Resend to Business ($100/month, 100K emails/month).

#### 4. Rate Limiter Memory Risk

**Impact:** 50K entries in the in-memory Map. Each entry is an IP:prefix → timestamps array. At ~100 bytes per entry = ~5MB. Not critical yet, but under sustained attack, could grow to fill the 128MB Worker memory limit.
**Remediation:** Replace in-memory rate limiting with Cloudflare WAF Rate Limiting Rules ($0, included in Pro plan) or Durable Objects ($0.15/million requests).

#### 5. Admin Users List BROKEN

**Impact:** Fetching 10,000 rows with no pagination. Response payload ~1.5MB, query time ~2-5 seconds. Unusable.
**Remediation:** MUST add pagination before reaching 10K users. Also add search/filter by status.

#### 6. Logo Storage in D1

**Impact:** If 30% of users upload logos (avg 200KB base64), that's 3,000 × 200KB = 600MB in D1 TEXT columns. D1 is optimized for structured data, not binary blobs.
**Remediation:** Migrate logo storage to Cloudflare R2 ($0.015/GB/month). Store R2 URL in profiles table instead of base64.

#### 7. Alias SHA-256 Recalculation

**Impact:** Every alias lookup recomputes SHA-256 hash. At 10K users each looking up 3 aliases/day = 30K hash operations. Individually fast (~0.1ms each) but adds up.
**Remediation:** Cache alias → hash mappings in a Map. Only 676 possible combinations (AA-ZZ), so the entire cache is <100KB.

### Data Volume Estimate

| Table        | Rows         | Size                                 |
| ------------ | ------------ | ------------------------------------ |
| users        | 10,000       | ~1 MB                                |
| profiles     | 10,000       | ~1.5 MB (+600 MB if logos in base64) |
| templates    | 50,000       | ~2.5 MB                              |
| schedules    | 30,000       | ~3 MB                                |
| appointments | 480,000      | ~30 MB                               |
| audit_log    | 50,000       | ~3 MB                                |
| **Total**    | **~630,000** | **~41 MB** (without logos)           |

### Cost Impact

| Service            | Action                   | Monthly Cost    |
| ------------------ | ------------------------ | --------------- |
| Cloudflare Workers | Paid plan                | $5              |
| Cloudflare D1      | Paid tier                | ~$4             |
| Cloudflare R2      | Logo storage (1 GB)      | $0.015          |
| Resend             | Business plan            | $100            |
| Cloudflare WAF     | Rate limiting (Pro plan) | $20             |
| **Total**          |                          | **~$129/month** |

**Revenue at 10K users:** $30,000/month (at $3/user).
**Infrastructure as % of revenue:** 0.43%. Excellent margin.

---

## 6. Performance Benchmarks

### Query Performance by Operation

| Operation                      | Queries       | P50 (100 users) | P95 (1K users) | P95 (10K users) |
| ------------------------------ | ------------- | --------------- | -------------- | --------------- |
| GET /auth/me                   | 1 (JOIN)      | 5ms             | 8ms            | 15ms            |
| GET /schedules (page)          | 2             | 10ms            | 15ms           | 25ms            |
| GET /schedules/:id             | 2             | 8ms             | 12ms           | 20ms            |
| POST /schedules                | 4 + N         | 50ms            | 80ms           | 150ms           |
| POST /auth/firebase (new)      | 11            | 100ms           | 150ms          | 250ms           |
| POST /auth/firebase (existing) | 3             | 15ms            | 20ms           | 30ms            |
| GET /admin/users               | 1 (full scan) | 10ms            | 200ms          | 2-5s            |
| JWT verification               | 0 (crypto)    | 1ms             | 1ms            | 1ms             |

### Frontend Performance

| Metric                   | Target      | Measured (Dev) |
| ------------------------ | ----------- | -------------- |
| First Contentful Paint   | <1.5s       | ~800ms         |
| Largest Contentful Paint | <2.5s       | ~1.2s          |
| Time to Interactive      | <3.5s       | ~1.5s          |
| Cumulative Layout Shift  | <0.1        | ~0.02          |
| Main Bundle Size         | <100KB gzip | ~85KB gzip     |
| Lazy Route Chunk (avg)   | <30KB gzip  | ~15KB gzip     |

---

## 7. Scaling Remediation Roadmap

### At 500 Users (Pre-emptive)

- [ ] Upgrade Resend to Pro ($20/month)
- [ ] Add pagination to admin users list
- [ ] Batch template INSERTs on registration (5 → 1 query)

### At 2,000 Users

- [ ] Upgrade to Workers Paid ($5/month)
- [ ] Monitor D1 write limits
- [ ] Add alias hash caching

### At 5,000 Users

- [ ] Upgrade to D1 paid tier
- [ ] Migrate logos from D1 to R2
- [ ] Consider Cloudflare Pro for WAF rate limiting

### At 10,000 Users

- [ ] Upgrade Resend to Business ($100/month)
- [ ] Replace in-memory rate limiter with Cloudflare WAF or Durable Objects
- [ ] Paginate ALL list endpoints
- [ ] Add database query monitoring
- [ ] Consider read replicas or caching layer

---

## 8. Architecture Decision Records

### ADR-001: Cloudflare over AWS/Vercel

**Context:** Needed a hosting platform for a full-stack web application with minimal cost.

**Decision:** Use Cloudflare's full stack (Pages + Workers + D1 + R2 + DNS + CDN).

**Rationale:**

- Free tier covers ~1,000 active users ($0/month)
- V8 isolates (not containers) = no cold starts, ~5ms startup
- Edge-first: code runs in 300+ cities, closest to user
- Single vendor for frontend, API, database, DNS, CDN, WAF, bot protection
- D1 (SQLite at the edge) is perfect for read-heavy workloads

**Consequences:**

- D1 is SQLite (no stored procedures, triggers, or complex joins)
- Worker CPU limit: 50ms per request (sufficient for our use case)
- D1 free tier: 5M reads/day, 100K writes/day (sufficient to ~5K users)
- Vendor lock-in to Cloudflare (mitigated by standard SQL and portable code)

**Status:** Accepted. Revisit at 10K users if D1 limitations become blocking.

---

### ADR-002: Firebase Auth over Custom Auth

**Context:** Needed user authentication supporting Google Sign-In and Phone SMS.

**Decision:** Use Firebase Auth as the identity provider, with PTOWL issuing its own JWT sessions.

**Rationale:**

- Firebase handles OAuth complexity (token exchange, refresh, account recovery)
- Firebase handles SMS delivery (country-specific routing, fraud protection)
- Reduces PTOWL's auth surface area to just JWT verification
- Firebase free tier: 10K phone verifications/month
- Well-tested by millions of applications

**Consequences:**

- Dependency on Google/Firebase
- Firebase ID tokens use RS256 (requires fetching Google public keys)
- Account creation is two-phase: Firebase creates identity, PTOWL creates user record
- Phone auth includes Firebase's own reCAPTCHA (conflicts with Turnstile)

**Status:** Accepted.

---

### ADR-003: Sports Aliases over Encryption

**Context:** Needed to display patient identifiers without storing Protected Health Information (PHI).

**Decision:** Map 2-letter patient initials to sports figure names via SHA-256 hash. Store only the alias, never the real name.

**Rationale:**

- "Zero PII" is stronger than "encrypted PII"
- If database is compromised: attacker sees "LeBron James", not a real patient name
- Deterministic: same initials always map to same alias (consistent UX)
- No encryption keys to manage, rotate, or leak
- 676 possible aliases (26 × 26) covers all two-letter combinations

**Consequences:**

- Two patients with same initials get same alias (acceptable — initials are not unique identifiers)
- Limited to 676 aliases (sufficient for individual PT use case)
- Alias ↔ initials mapping is technically reversible (SHA-256 of 676 possible inputs can be brute-forced) — but initials alone are not PHI

**Status:** Accepted. If HIPAA certification is ever pursued, get legal review of de-identification adequacy.

---

### ADR-004: In-Memory Rate Limiting

**Context:** Needed rate limiting on auth endpoints to prevent brute-force attacks.

**Decision:** Implement sliding-window rate limiting using per-Worker-isolate in-memory Maps.

**Rationale:**

- Simplest possible implementation (no external state store)
- Cloudflare typically routes same IP to same isolate
- Sufficient for current scale (100 users)
- Auto-cleanup of stale entries every 5 minutes
- No additional cost ($0)

**Consequences:**

- Not globally coordinated across edge locations
- Resets on Worker restart/redeploy
- Memory grows linearly with unique IPs (potential OOM at extreme scale)
- At 10K+ users, should migrate to Cloudflare WAF or Durable Objects

**Status:** Accepted with planned migration at 10K users.

---

### ADR-005: httpOnly Cookies over localStorage

**Context:** Needed to store JWT tokens securely in the browser.

**Decision:** Store access and refresh tokens in httpOnly Secure SameSite=Lax cookies.

**Rationale:**

- httpOnly: JavaScript cannot read the tokens (prevents XSS-based theft)
- Secure: Only sent over HTTPS
- SameSite=Lax: Prevents CSRF on GET requests; POST/PUT/DELETE protected by CSRF tokens
- Browser automatically includes cookies on same-origin requests (no client-side token management)

**Consequences:**

- Requires CORS credentials: true configuration
- Cannot read tokens client-side (by design — we use a separate csrf_token cookie that IS readable)
- Cookie size limits (~4KB per cookie) — not an issue for JWTs

**Status:** Accepted. Industry best practice for token storage.

---

### ADR-006: Monorepo over Multi-Repo

**Context:** Project has three packages (shared, api, web) that share types and validators.

**Decision:** Use pnpm workspace monorepo.

**Rationale:**

- Shared types ensure API contract stays in sync between frontend and backend
- Atomic commits: change a shared type + update all consumers in one commit
- Single CI/CD pipeline tests everything together
- Single lock file (pnpm-lock.yaml) — no version drift between packages
- Simpler developer experience: one `git clone`, one `pnpm install`

**Consequences:**

- Lock file is shared (updating one package's dependencies affects all)
- Build order matters: shared must build before api/web
- Slightly larger repository size

**Status:** Accepted. Standard practice for full-stack TypeScript projects.

---

_This document should be reviewed and updated when user count crosses each scaling threshold._
