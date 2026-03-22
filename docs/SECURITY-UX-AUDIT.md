# Patient Owl — Pre-Launch Security & UX Audit

**Date:** March 22, 2026
**Auditor:** Automated codebase analysis
**Status:** Pre-launch review

---

## Critical Findings

### 1. HIPAA BAA Requirements
- Cloudflare D1 (Pro plan) does NOT include a BAA — Enterprise required
- Firebase Auth needs an explicit Google Cloud BAA
- Resend does NOT offer BAAs — must replace for HIPAA compliance
- **Mitigation:** App never stores real patient names. Initials + appointment dates are borderline PHI when combined with external clinic records.
- **Action:** Document HIPAA positioning clearly. Consider Postmark or AWS SES (both offer BAAs) as Resend replacement.

### 2. Third-Party HIPAA Status

| Service | BAA Available? | Current Risk |
|---------|---------------|-------------|
| Cloudflare D1 | Enterprise only | HIGH — PHI-adjacent data stored |
| Firebase Auth | Yes (Google Cloud) | MEDIUM — phone numbers flow through |
| Resend | No | LOW — emails contain aliases, not PHI |
| OneSignal | Enterprise only | LOW — if notifications never contain PHI |

---

## High Priority

### 3. Audit Log Retention
- Current: 90 days (cron cleanup in index.ts)
- Required: 6 years minimum for HIPAA
- **Fix:** Change retention to 2,190 days or archive to cold storage

### 4. Missing Audit Events
Events NOT being logged:
- Schedule creation/deletion
- Schedule sharing (share token generation)
- Patient code generation
- Patient link/unlink
- Profile updates
- Failed login attempts
- Logout events
- JWT refresh events

### 5. Offline Handling
- No service worker
- No offline detection banner
- API failures show no user feedback when offline

### 6. Expired Patient Code Cleanup
- Not included in daily cron job
- Codes with `expires_at < now` accumulate in DB forever

### 7. Account Security — SIM Swap
- Firebase phone auth vulnerable to SIM swap attacks
- No secondary verification factor for regular users
- MFA supported but not enforced

---

## Medium Priority

### 8. Color Contrast (WCAG AA)
- `--gray-text: #6B7F73` on white = ~3.5:1 ratio
- WCAG AA requires 4.5:1 for normal text
- **Fix:** Darken to `#4A5C50` or similar

### 9. Touch Targets
- Mobile button padding `0.5rem 0.75rem` = ~32x40px
- Apple guideline: minimum 44x44px
- **Fix:** Add `min-height: 44px` to interactive elements

### 10. Cookie SameSite Inconsistency
- Login: `sameSite: 'Lax'`
- Refresh: `sameSite: isProduction ? 'Strict' : 'Lax'`
- **Fix:** Standardize to `Strict` for all production cookies

### 11. Bundle Size
- Main chunk: 1,103 KB (315 KB gzipped)
- Firebase SDK (~400KB) and FullCalendar should be separate chunks
- **Fix:** Add `manualChunks` to Vite config

### 12. Silent Error Handling
- PatientHomePage: API failure shows empty state, no error message
- Some schedule creation paths log errors to console only
- **Fix:** Add error toasts to all API failure paths

### 13. Sessions Table Unused
- `sessions` table exists in schema but never written to or checked
- JWTs cannot be revoked — suspended users retain access for up to 15 minutes
- **Fix:** Either populate and check, or remove the table

---

## Low Priority

### 14. Input Validation Gaps
- Patient route GET/DELETE don't validate scheduleId format
- Notes field: Zod schema allows 500 chars, API truncates at 1000 (mismatch)
- Legacy 2-part CSRF format still accepted (no timestamp, lives forever)

### 15. Browser Compatibility
- `dvh` units used without fallback (pre-2023 browsers)
- No Vite build target set (defaults to `esnext`)
- **Fix:** Set `build.target: 'es2020'`, add `vh` fallback before `dvh`

### 16. Performance
- No manual chunk splitting in Vite config
- Logos stored as base64 in D1 (up to 500KB each)
- No resource hints (preload/prefetch) for lazy routes

### 17. Minor UX
- No tooltip explaining sports aliases to first-time users
- Admin user list has no empty state
- Loading states use text instead of skeleton screens

---

## What's Already Strong

- JWT implementation via `jose` (gold standard library)
- CSRF with HMAC-signed double-submit + constant-time comparison
- CSP, HSTS, X-Frame-Options, Permissions-Policy all set via `hono/secure-headers`
- CORS locked to single origin
- Rate limiting via Cloudflare WAF
- Turnstile bot protection
- 505 automated tests passing
- Skip-to-content link, focus-visible outlines, prefers-reduced-motion support
- Comprehensive print CSS
- Onboarding checklist for new clinic users
- Empty states for patient and clinic views
