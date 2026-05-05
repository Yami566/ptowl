# PTOWL Technical Design Document (TDD)

**Document Version:** 1.0
**Last Updated:** 2026-03-16
**Author:** PTOWL Development Team
**Status:** Historical reference — superseded by PRD.md v2.0

> **⚠️ Doc-status note (May 5, 2026):** This TDD predates the
> Firebase→Clerk migration, the admin-console + patient-portal
> deletions, and the dropped password_reset_tokens / oauth_accounts
> / admin_totp tables. Several sections (auth flow diagrams, admin
> endpoints, password-reset migration 0002, /admin rate-limit table)
> describe state that no longer exists in the codebase.
>
> **Canonical sources for current state:**
>
> - Feature inventory + routes + API endpoints: [PRD.md](PRD.md)
> - Wire-level security claims: <https://ptowl.com/security>
> - Latest red-team pass: [RED-TEAM-FINDINGS.md](RED-TEAM-FINDINGS.md)
>
> The high-level architecture (Cloudflare Workers + Hono + D1 + R2),
> the de-identification methodology, and the schedule-generation
> algorithm sections remain accurate.

---

## 1. Architecture Overview

### System Architecture

```
                          ┌─────────────────────┐
                          │   Cloudflare CDN     │
                          │   (WAF + TLS + DNS)  │
                          └─────────┬───────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │                               │
           ┌───────▼───────┐               ┌───────▼───────┐
           │  Cloudflare   │               │  Cloudflare   │
           │    Pages      │               │   Workers     │
           │  (Frontend)   │               │    (API)      │
           │  React 19     │──── /api/* ──▶│   Hono 4.6    │
           │  + Vite 6     │               │               │
           └───────────────┘               └───────┬───────┘
                    │                               │
                    │                      ┌────────┼────────┐
                    │                      │        │        │
           ┌───────▼───────┐      ┌────────▼──┐ ┌──▼─────┐ ┌▼──────────┐
           │   Firebase    │      │ Cloudflare│ │ Resend │ │ Cloudflare│
           │     Auth      │      │    D1     │ │  API   │ │ Turnstile │
           │ (Google+Phone)│      │ (SQLite)  │ │(Email) │ │  (Bot)    │
           └───────────────┘      └───────────┘ └────────┘ └───────────┘
```

### Technology Stack

| Layer          | Technology           | Version | Purpose                  |
| -------------- | -------------------- | ------- | ------------------------ |
| Frontend       | React                | 19.0.0  | UI framework             |
| Frontend       | TypeScript           | 5.7.0   | Type safety              |
| Frontend       | Vite                 | 6.0.0   | Build tooling            |
| Frontend       | React Router         | 7.1.0   | Client-side routing      |
| Frontend       | FullCalendar         | 6.1.20  | Calendar view            |
| Frontend       | Firebase SDK         | 12.10.0 | Auth client              |
| API            | Hono                 | 4.6.0   | HTTP framework           |
| API            | jose                 | 6.2.1   | JWT signing/verification |
| API            | TypeScript           | 5.7.0   | Type safety              |
| Validation     | Zod                  | 4.3.6   | Schema validation        |
| Testing        | Vitest               | 2.1.0   | Test runner              |
| Hosting        | Cloudflare Pages     | —       | Frontend hosting         |
| Runtime        | Cloudflare Workers   | —       | API runtime              |
| Database       | Cloudflare D1        | —       | SQLite database          |
| Email          | Resend API           | —       | Transactional email      |
| Auth           | Firebase Auth        | —       | User authentication      |
| Bot Protection | Cloudflare Turnstile | —       | CAPTCHA alternative      |

### Monorepo Structure

```
ptowl/
├── apps/
│   ├── api/                    # Hono API on Cloudflare Workers
│   │   ├── src/
│   │   │   ├── crypto/         # JWT, password hashing
│   │   │   ├── middleware/     # auth (CSRF is global hono/csrf in index.ts)
│   │   │   ├── migrations/    # D1 SQL migrations (4 files)
│   │   │   ├── routes/        # API route handlers (8 files)
│   │   │   ├── services/      # Email service
│   │   │   ├── types/         # TypeScript type definitions
│   │   │   └── index.ts       # Hono app entry point
│   │   ├── tests/             # API test suite (10 files)
│   │   ├── wrangler.jsonc     # Cloudflare Worker config
│   │   └── .dev.vars          # Local development secrets
│   └── web/                   # React frontend on Cloudflare Pages
│       ├── src/
│       │   ├── components/    # Reusable UI components
│       │   ├── contexts/      # React context providers
│       │   ├── hooks/         # Custom React hooks
│       │   ├── pages/         # Route page components (16 files)
│       │   ├── App.tsx        # Root component + routing
│       │   └── main.tsx       # Entry point
│       ├── tests/             # Frontend test suite (2 files)
│       └── vite.config.ts     # Vite configuration
├── packages/
│   └── shared/                # Shared types, validators, constants
│       ├── src/
│       │   ├── constants/     # DEFAULT_TEMPLATES, TIER_LIMITS
│       │   ├── types/         # Shared TypeScript types
│       │   └── validators/    # Zod schemas (input validation)
│       └── tests/             # Shared test suite (3 files)
├── docs/                      # Project documentation
├── pnpm-workspace.yaml        # Workspace definition
├── tsconfig.base.json         # Shared TypeScript config
├── .github/workflows/         # GitHub Actions: ci.yml, deploy.yml,
│                              # codeql.yml, release-please.yml
├── brainstorm.md              # Product strategy document
└── ADMIN-GUIDE.md             # Operations guide
```

---

## 2. Data Model

### Entity Relationship Diagram

```
users (1) ──────── (1) profiles
  │
  ├──── (1:N) templates
  │
  ├──── (1:N) schedules ──── (1:N) appointments
  │
  ├──── (1:N) oauth_accounts
  │
  ├──── (1:N) audit_log
  │
  ├──── (0:1) admin_totp [UNUSED]
  │
  └──── (1:N) sessions [UNUSED]
```

### Table Definitions

#### users

| Column        | Type | Constraints                                     | Description                     |
| ------------- | ---- | ----------------------------------------------- | ------------------------------- |
| id            | TEXT | PK, default hex(randomblob(16))                 | 32-char hex ID                  |
| email         | TEXT | NOT NULL, UNIQUE                                | User email                      |
| password_hash | TEXT | NOT NULL                                        | PBKDF2-SHA256 hash (admin only) |
| display_name  | TEXT | NOT NULL, default ''                            | Display name                    |
| status        | TEXT | CHECK IN (pending, approved, denied, suspended) | Account status                  |
| role          | TEXT | CHECK IN (user, admin)                          | Authorization role              |
| tier          | TEXT | CHECK IN (free, paid)                           | Subscription tier               |
| created_at    | TEXT | NOT NULL, default datetime('now')               | ISO timestamp                   |
| updated_at    | TEXT | NOT NULL, default datetime('now')               | ISO timestamp                   |

**Indexes:** `idx_users_email(email)`, `idx_users_status(status)`

#### profiles

| Column         | Type | Constraints                                    | Description          |
| -------------- | ---- | ---------------------------------------------- | -------------------- |
| id             | TEXT | PK                                             | 32-char hex ID       |
| user_id        | TEXT | NOT NULL, UNIQUE, FK → users ON DELETE CASCADE | Owner                |
| clinic_name    | TEXT | NOT NULL, default ''                           | Clinic name          |
| clinic_address | TEXT | NOT NULL, default ''                           | Address              |
| clinic_phone   | TEXT | NOT NULL, default ''                           | Phone                |
| clinic_email   | TEXT | NOT NULL, default ''                           | Email                |
| logo_url       | TEXT | DEFAULT NULL                                   | Base64 logo data URL |
| created_at     | TEXT |                                                | ISO timestamp        |
| updated_at     | TEXT |                                                | ISO timestamp        |

**Indexes:** `idx_profiles_user(user_id)`

#### templates

| Column            | Type    | Constraints                                  | Description              |
| ----------------- | ------- | -------------------------------------------- | ------------------------ |
| id                | TEXT    | PK                                           | 32-char hex ID           |
| user_id           | TEXT    | NOT NULL, FK → users ON DELETE CASCADE       | Owner                    |
| hotkey            | INTEGER | NOT NULL, CHECK 1-9, UNIQUE(user_id, hotkey) | Keyboard shortcut        |
| name              | TEXT    | NOT NULL                                     | Template name            |
| sessions_per_week | INTEGER | NOT NULL, default 2                          | Weekly frequency         |
| duration_weeks    | INTEGER | NOT NULL, default 2                          | Total weeks              |
| default_time      | TEXT    | DEFAULT '09:00'                              | Default appointment time |
| is_active         | INTEGER | NOT NULL, default 1                          | Active toggle            |
| sort_order        | INTEGER | NOT NULL, default 0                          | Display order            |
| created_at        | TEXT    |                                              | ISO timestamp            |
| updated_at        | TEXT    |                                              | ISO timestamp            |

**Indexes:** `idx_templates_user(user_id)`

#### schedules

| Column            | Type    | Constraints                            | Description        |
| ----------------- | ------- | -------------------------------------- | ------------------ |
| id                | TEXT    | PK                                     | 32-char hex ID     |
| user_id           | TEXT    | NOT NULL, FK → users ON DELETE CASCADE | Owner              |
| template_id       | TEXT    | FK → templates ON DELETE SET NULL      | Source template    |
| patient_initials  | TEXT    | NOT NULL, default ''                   | 2-letter initials  |
| patient_alias     | TEXT    | NOT NULL, default ''                   | Sports figure name |
| start_date        | TEXT    | NOT NULL                               | ISO date           |
| end_date          | TEXT    | NOT NULL                               | ISO date           |
| sessions_per_week | INTEGER | NOT NULL                               | Frequency snapshot |
| duration_weeks    | INTEGER | NOT NULL                               | Duration snapshot  |
| provider_name     | TEXT    | NOT NULL, default ''                   | PT name            |
| notes             | TEXT    | DEFAULT ''                             | Schedule notes     |
| view_preference   | TEXT    | CHECK IN (table, calendar)             | Default view       |
| created_at        | TEXT    |                                        | ISO timestamp      |
| updated_at        | TEXT    |                                        | ISO timestamp      |

**Indexes:** `idx_schedules_user(user_id)`, `idx_schedules_created(created_at)`

#### appointments

| Column           | Type    | Constraints                                | Description      |
| ---------------- | ------- | ------------------------------------------ | ---------------- |
| id               | TEXT    | PK                                         | 32-char hex ID   |
| schedule_id      | TEXT    | NOT NULL, FK → schedules ON DELETE CASCADE | Parent schedule  |
| appointment_date | TEXT    | NOT NULL                                   | ISO date         |
| appointment_time | TEXT    | NOT NULL, default '09:00'                  | Time (HH:MM)     |
| provider_name    | TEXT    | DEFAULT ''                                 | PT name override |
| reminder_sent    | INTEGER | NOT NULL, default 0                        | Reminder flag    |
| sort_order       | INTEGER | NOT NULL, default 0                        | Display order    |
| created_at       | TEXT    |                                            | ISO timestamp    |
| updated_at       | TEXT    |                                            | ISO timestamp    |

**Indexes:** `idx_appointments_schedule(schedule_id)`, `idx_appointments_date(appointment_date)`

#### oauth_accounts

| Column              | Type | Constraints                            | Description                |
| ------------------- | ---- | -------------------------------------- | -------------------------- |
| id                  | TEXT | PK                                     | 32-char hex ID             |
| user_id             | TEXT | NOT NULL, FK → users ON DELETE CASCADE | Owner                      |
| provider            | TEXT | NOT NULL                               | 'google', 'phone', 'apple' |
| provider_account_id | TEXT | NOT NULL                               | Provider's user ID         |
| created_at          | TEXT |                                        | ISO timestamp              |

**Indexes:** `idx_oauth_provider(provider, provider_account_id)`, `idx_oauth_user(user_id)`

#### audit_log

| Column     | Type | Constraints | Description        |
| ---------- | ---- | ----------- | ------------------ |
| id         | TEXT | PK          | 32-char hex ID     |
| user_id    | TEXT | nullable    | Actor user ID      |
| action     | TEXT | NOT NULL    | Action identifier  |
| detail     | TEXT | DEFAULT ''  | JSON detail string |
| ip_address | TEXT | DEFAULT ''  | Client IP          |
| created_at | TEXT |             | ISO timestamp      |

**Indexes:** `idx_audit_action(action)`, `idx_audit_created(created_at)`

**Tracked Actions:** `admin_login_failed`, `admin_code_sent`, `admin_code_failed`, `admin_verified`, `approve_user`, `deny_user`, `register_firebase`, `login_firebase`

### Migration History

| Migration | File                              | Description                                                                                       |
| --------- | --------------------------------- | ------------------------------------------------------------------------------------------------- |
| 0001      | 0001_initial.sql                  | Core schema: users, profiles, templates, schedules, appointments, admin_totp, sessions, audit_log |
| 0002      | 0002_password_reset_tokens.sql    | Password reset tokens table                                                                       |
| 0003      | 0003_admin_verification_codes.sql | Admin email 2FA codes table                                                                       |
| 0004      | 0004_oauth_accounts.sql           | OAuth account linking table                                                                       |

---

## 3. API Contract

### Authentication Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────┐
│  Client   │     │ Firebase Auth │     │ PTOWL API    │     │   D1    │
│ (Browser) │     │   (Google)   │     │  (Workers)   │     │ (SQLite)│
└─────┬─────┘     └──────┬───────┘     └──────┬───────┘     └────┬────┘
      │                  │                     │                  │
      │ 1. signInWithPopup()                   │                  │
      │─────────────────▶│                     │                  │
      │                  │                     │                  │
      │ 2. Firebase ID Token                   │                  │
      │◀─────────────────│                     │                  │
      │                  │                     │                  │
      │ 3. POST /api/v1/auth/firebase          │                  │
      │   { idToken }    │                     │                  │
      │────────────────────────────────────────▶│                  │
      │                  │                     │                  │
      │                  │    4. Verify token   │                  │
      │                  │    (fetch Firebase   │                  │
      │                  │     public keys)     │                  │
      │                  │◀────────────────────│                  │
      │                  │                     │                  │
      │                  │                     │ 5. Upsert user   │
      │                  │                     │─────────────────▶│
      │                  │                     │                  │
      │ 6. Set-Cookie: access_token (httpOnly) │                  │
      │    Set-Cookie: refresh_token (httpOnly) │                  │
      │◀────────────────────────────────────────│                  │
```

### CSRF Flow

CSRF protection is provided by two cooperating layers — no per-user
token to manage on the client.

```
1. Browser auto-attaches Origin header to every cross-origin
   POST/PUT/PATCH/DELETE.
2. Strict CORS middleware (origin: [FRONTEND_URL], credentials: true)
   rejects any cross-origin JSON request that doesn't pass the
   preflight check.
3. hono/csrf middleware additionally enforces an Origin/Referer
   match on form-encoded POSTs (application/x-www-form-urlencoded,
   multipart/form-data, text/plain) — the attack vectors that bypass
   CORS preflight via HTML <form> submission.
```

### Request/Response Format

All API responses follow this envelope:

```typescript
// Success
{ ok: true, data: T }

// Error
{ ok: false, error: { code: string, message: string } }
```

### Rate Limiting

| Endpoint           | Window | Max Requests | Key             |
| ------------------ | ------ | ------------ | --------------- |
| /auth/refresh      | 60s    | 20           | IP:refresh      |
| /auth/firebase     | 60s    | 10           | IP:firebase     |
| /admin/login       | 60s    | 5            | IP:admin-login  |
| /admin/send-code   | 60s    | 3            | IP:admin-code   |
| /admin/verify-code | 60s    | 5            | IP:admin-verify |

Implementation: Sliding window algorithm, in-memory Map per Worker isolate. Cleanup every 5 minutes.

---

## 4. Security Architecture

### 7-Layer Security Model

```
Layer 1: Cloudflare WAF (DDoS, bot mitigation, IP reputation)
    ↓
Layer 2: CORS (strict origin: FRONTEND_URL only)
    ↓
Layer 3: Security Headers (CSP, HSTS, X-Frame-Options, nosniff, Permissions-Policy)
    ↓
Layer 4: Rate Limiting (per-IP sliding window on auth endpoints)
    ↓
Layer 5: Authentication (Firebase JWT → PTOWL JWT in httpOnly cookies)
    ↓
Layer 6: Authorization (role-based: user vs admin, admin requires 2FA)
    ↓
Layer 7: Input Validation (Zod schemas on all API inputs, parameterized SQL)
```

### Security Headers (Configured)

| Header                    | Value                                                                              | Purpose                  |
| ------------------------- | ---------------------------------------------------------------------------------- | ------------------------ |
| Content-Security-Policy   | default-src 'self'; script-src 'self' challenges.cloudflare.com apis.google.com... | Prevent XSS              |
| Strict-Transport-Security | max-age=63072000; includeSubDomains; preload                                       | Force HTTPS (2 years)    |
| X-Frame-Options           | DENY                                                                               | Prevent clickjacking     |
| X-Content-Type-Options    | nosniff                                                                            | Prevent MIME sniffing    |
| Referrer-Policy           | strict-origin-when-cross-origin                                                    | Control referrer leakage |
| Permissions-Policy        | camera=(), microphone=(), geolocation=(), payment=()                               | Disable browser features |

### JWT Token Design

| Property   | Access Token                         | Refresh Token                            |
| ---------- | ------------------------------------ | ---------------------------------------- |
| Algorithm  | HS256 (HMAC-SHA256)                  | HS256                                    |
| Expiry     | 1 hour                               | 7 days                                   |
| Storage    | httpOnly Secure SameSite=Lax cookie  | httpOnly Secure SameSite=Lax cookie      |
| Payload    | { sub, email, role, tier, iat, exp } | { sub, type: 'refresh', iat, exp }       |
| Validation | Cryptographic only (0 DB queries)    | Cryptographic + DB user lookup (1 query) |

### Password Hashing (Admin Only)

- Algorithm: PBKDF2-SHA256
- Iterations: 100,000
- Salt: 16 bytes (crypto.getRandomValues)
- Output: 32 bytes
- Storage: `iterations:salt:hash` (all base64)

### PII Protection: Sports Alias System

- 676 two-letter combinations (AA-ZZ) mapped to sports figures
- SHA-256 hash of initials determines alias deterministically
- No real patient names stored anywhere in the system
- Example: "LJ" → SHA-256 → index 423 → "LeBron James"

---

## 5. Infrastructure

### Cloudflare Configuration

**Workers (API):**

- Compatibility date: 2024-12-01
- Compatibility flags: nodejs_compat
- Routes: ptowl.com/api/_, www.ptowl.com/api/_
- D1 binding: ptowl-db
- Environment vars: ENVIRONMENT, FRONTEND_URL
- Secrets: JWT_SECRET, ADMIN_EMAIL, EMAIL_API_KEY, TURNSTILE_SECRET_KEY, FIREBASE_PROJECT_ID

**Pages (Frontend):**

- Build command: pnpm build:web
- Build output: apps/web/dist
- Root directory: /
- Framework preset: None (custom Vite)

**D1 Database:**

- Name: ptowl-db
- ID: d6c122ba-decb-47d3-a444-2627c6f8c8fd
- Migrations directory: src/migrations/
- Free tier: 5GB storage, 5M reads/day, 100K writes/day

### Domain & DNS

- Registrar: Cloudflare
- Domain: ptowl.com
- SSL: Cloudflare Universal SSL (auto-renewed)
- HSTS: Enabled with preload flag

---

## 6. CI/CD Pipeline

### Production Pipeline (.github/workflows/deploy.yml)

```
Trigger: Push to main branch
Concurrency group: deploy-production (cancel-in-progress: false)

Step 1: Checkout + setup pnpm 9 / Node 20 (with pnpm cache)
Step 2: pnpm install --frozen-lockfile
Step 3: pnpm build (shared → api → web)
Step 4: cloudflare/wrangler-action@v3 — deploy API Worker
Step 5: cloudflare/wrangler-action@v3 — deploy Frontend to Pages
```

### CI Pipeline (.github/workflows/ci.yml)

```
Trigger: PR to main + pushes to main
Concurrency group: ci-${{ github.ref }} (cancel-in-progress: true)

Parallel jobs (each on a fresh runner):
- lint        → pnpm lint
- typecheck   → pnpm typecheck
- test        → pnpm test:unit
- build       → pnpm build
- commitlint  → validates Conventional Commits on PR commits
```

### Other workflows

- .github/workflows/codeql.yml — CodeQL security scan on PR + weekly cron.
- .github/workflows/release-please.yml — automated semver release PRs
  driven by Conventional Commit messages.

### Secrets Management

- Cloudflare API token: GitHub Actions secret `CLOUDFLARE_API_TOKEN`
- Cloudflare account ID: GitHub Actions secret `CLOUDFLARE_ACCOUNT_ID`
- Worker runtime secrets (JWT_SECRET, EMAIL_API_KEY, etc.):
  `wrangler secret put <NAME>` (encrypted at rest by Cloudflare)
- Local development: apps/api/.dev.vars file (gitignored)

---

## 7. Environment Configuration

### Development

| Variable             | Value                                                              |
| -------------------- | ------------------------------------------------------------------ |
| ENVIRONMENT          | development                                                        |
| FRONTEND_URL         | http://localhost:3000                                              |
| JWT_SECRET           | Test key (64-char hex)                                             |
| TURNSTILE_SECRET_KEY | 1x0000000000000000000000000000000AA (always-pass)                  |
| D1                   | Local SQLite via wrangler dev --local --persist-to .wrangler/state |

### Production

| Variable             | Value                                         |
| -------------------- | --------------------------------------------- |
| ENVIRONMENT          | production                                    |
| FRONTEND_URL         | https://ptowl.com                             |
| JWT_SECRET           | Secret (64-char hex, set via wrangler secret) |
| TURNSTILE_SECRET_KEY | Real Cloudflare key                           |
| FIREBASE_PROJECT_ID  | Real Firebase project ID                      |
| ADMIN_EMAIL          | help@ptowl.com                                |
| EMAIL_API_KEY        | Resend API key                                |
| D1                   | Remote ptowl-db                               |

---

## 8. Email Service

### Provider: Resend API

| Template              | Trigger                     | Recipient              |
| --------------------- | --------------------------- | ---------------------- |
| New user notification | User registers via Firebase | Admin (help@ptowl.com) |
| User approved         | Admin approves user         | User's email           |
| User denied           | Admin denies user           | User's email           |
| Admin 2FA code        | Admin requests login code   | Admin email            |

### Configuration

- From address: PTOWL <noreply@ptowl.com>
- Free tier: 100 emails/day, 3,000/month
- Delivery: Fire-and-forget via `c.executionCtx.waitUntil()` (non-blocking)
- Failure handling: Graceful degradation — email failures don't block user operations

---

## 9. Testing Strategy

### Test Distribution

| Package         | Tests   | Focus                                                        |
| --------------- | ------- | ------------------------------------------------------------ |
| packages/shared | 19      | Schedule generator, input validation, PII protection         |
| apps/api        | 388     | JWT, CSRF (origin), OWASP, penetration, Turnstile, hardening |
| apps/web        | 72      | UI security, penetration testing                             |
| **Total**       | **479** |                                                              |

### Test Categories

| Category                        | Count | Files                                              |
| ------------------------------- | ----- | -------------------------------------------------- |
| CSRF (origin-based integration) | 5     | csrf-origin.test.ts                                |
| JWT (comprehensive)             | ~150  | jwt-comprehensive.test.ts, jwt.test.ts             |
| OWASP Top 10                    | ~80   | owasp.test.ts                                      |
| Penetration testing             | ~60   | penetration.test.ts (API + web)                    |
| Turnstile bot protection        | ~40   | turnstile-comprehensive.test.ts, turnstile.test.ts |
| Security hardening              | ~50   | hardening-comprehensive.test.ts                    |
| Schedule generation             | ~50   | schedule-generator.test.ts                         |
| Input validation                | ~80   | input.test.ts, schemas.test.ts                     |
| PII protection                  | ~30   | pii.test.ts                                        |
| UI security                     | ~30   | ui-security.test.ts                                |

### Test Runner

- Framework: Vitest 2.1
- Config: vitest.config.ts per package
- CI gate: All 692 tests must pass before deployment

---

## 10. Monitoring & Observability

### Current State

| Capability                | Status          | Details                                      |
| ------------------------- | --------------- | -------------------------------------------- |
| Error logging             | Basic           | console.error() in route catch blocks        |
| Audit trail               | Implemented     | audit_log table with action, detail, IP      |
| Health check              | Implemented     | GET /api/v1/health → { ok: true }            |
| Cloudflare analytics      | Available       | Request counts, error rates via CF dashboard |
| Error monitoring (Sentry) | Not implemented | Planned                                      |
| Structured logging        | Not implemented | Planned                                      |
| APM                       | Not implemented | No plans                                     |

### Planned Improvements

1. React Error Boundaries (catch render errors, show fallback)
2. Structured JSON error logs (path, method, timestamp, requestId)
3. Optional: Sentry free tier integration for error tracking

---

## 11. Architecture Decision Records (ADRs)

### ADR-001: Cloudflare over AWS/Vercel

**Decision:** Use Cloudflare Pages + Workers + D1 as the full stack.
**Rationale:** Edge-first architecture with generous free tier. Pages + Workers + D1 + DNS + CDN + WAF all from one vendor at $0/month for the first ~1,000 users. Eliminates cold starts (V8 isolates, not containers).
**Trade-offs:** D1 is SQLite (limited compared to Postgres). No stored procedures or triggers. Worker CPU limit of 50ms per request.

### ADR-002: Firebase Auth over Custom Auth

**Decision:** Delegate user authentication to Firebase Auth (Google + Phone providers).
**Rationale:** Reduces authentication attack surface dramatically. Firebase handles OAuth complexity, SMS delivery, token refresh, account recovery. PTOWL only needs to verify Firebase ID tokens (using jose library + Firebase public keys).
**Trade-offs:** Dependency on Google. Firebase free tier: 10K phone auths/month.

### ADR-003: Sports Aliases over Encryption

**Decision:** Map patient initials to sports figure names instead of encrypting real names.
**Rationale:** "Zero PII" is stronger than "encrypted PII." If the database is compromised, there are no real names to decrypt. The 676-alias system (AA-ZZ → sports figures) provides human-readable labels without storing any Protected Health Information.
**Trade-offs:** Only 676 unique aliases. Two patients with same initials get same alias.

### ADR-004: In-Memory Rate Limiting

**Decision:** Use per-Worker-isolate in-memory Maps for rate limiting.
**Rationale:** Simplest possible implementation. Cloudflare typically routes same IP to same isolate. No external state store needed. Sufficient for current scale (100 users).
**Trade-offs:** Not globally coordinated. A determined attacker hitting different edge locations could bypass. At 10K+ users, should migrate to Cloudflare WAF or Durable Objects.

### ADR-005: httpOnly Cookies over localStorage

**Decision:** Store JWT tokens in httpOnly Secure SameSite cookies, not localStorage.
**Rationale:** httpOnly cookies cannot be read by JavaScript, preventing XSS-based token theft. Combined with SameSite=Lax (Strict in prod), this also provides CSRF protection for GET requests. hono/csrf + strict CORS handle POST/PUT/PATCH/DELETE — see "CSRF Flow" section above.
**Trade-offs:** Requires cookie-aware CORS configuration. Cannot read tokens client-side (by design).

### ADR-006: Monorepo over Multi-Repo

**Decision:** Use pnpm workspace monorepo with packages/shared, apps/api, apps/web.
**Rationale:** Shared types and validators between frontend and backend ensure API contracts stay in sync. Atomic commits across packages. Single CI/CD pipeline tests everything together.
**Trade-offs:** Slightly more complex build configuration. Lock file is shared.

---

_This document is maintained alongside the codebase and updated as architecture evolves._
