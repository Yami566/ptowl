# PTOWL Validation Checklist

**Document Version:** 1.0
**Last Updated:** 2026-03-16
**Status:** Active

Items marked **[BUILT]** exist in production. Items marked **[PLANNED]** are in the roadmap but not yet implemented.

---

## 1. Authentication Flows

### Google Sign-In [BUILT]
- [ ] Click "Sign in with Google" on /login
- [ ] Google OAuth popup appears
- [ ] Select Google account → popup closes
- [ ] User created with status: pending (first login) OR logged in (returning user)
- [ ] httpOnly cookies set (access_token, refresh_token, csrf_token)
- [ ] Redirected to /dashboard (approved) or /pending (pending approval)

### Phone SMS Auth [BUILT]
- [ ] Enter phone number on /login
- [ ] SMS verification code received
- [ ] Enter 6-digit code
- [ ] User created/logged in
- [ ] Cookies set, redirected appropriately

### Admin Login [BUILT]
- [ ] Navigate to /admin
- [ ] Enter admin email (help@ptowl.com) and password
- [ ] Receive 2FA code via email
- [ ] Enter 6-digit code
- [ ] Admin panel loads with user management

### Admin 2FA [BUILT]
- [ ] 2FA code expires after 5 minutes
- [ ] Max 5 verification attempts per minute (rate limited)
- [ ] Invalid code shows error message
- [ ] Code is single-use (cannot reuse)

### Logout [BUILT]
- [ ] Click logout button
- [ ] access_token, refresh_token, csrf_token cookies cleared
- [ ] Redirected to /login
- [ ] Cannot access /dashboard after logout (redirected)

### Session Refresh [BUILT]
- [ ] Access token expires after 1 hour
- [ ] Refresh token automatically obtains new access token
- [ ] Refresh token expires after 7 days → user must re-login

---

## 2. Dashboard

### Template Cards [BUILT]
- [ ] 5 template cards displayed (hotkeys 2-6)
- [ ] Card 1 shows "Create New Routine" (Custom Wizard)
- [ ] Each card shows: name, sessions/week, duration, hotkey number
- [ ] Cards are keyboard-accessible

### Hotkey Shortcuts [BUILT]
- [ ] Press 1 → Custom Wizard opens
- [ ] Press 2 → Post-Op Knee Rehab selected
- [ ] Press 3 → Shoulder Recovery selected
- [ ] Press 4 → Low Back Pain Program selected
- [ ] Press 5 → Sports Injury Rehab selected
- [ ] Press 6 → Balance & Fall Prevention selected
- [ ] Hotkeys don't fire when typing in input fields

### Saved Schedules List [BUILT]
- [ ] Previously created schedules displayed in list
- [ ] Shows: patient alias, template name, date range, created date
- [ ] Click schedule → preview overlay opens
- [ ] Pagination works (20 per page)
- [ ] Empty state shown when no schedules exist

---

## 3. Schedule Wizard

### 3-Keypress Flow (Hotkeys 2-6) [BUILT]
- [ ] Press hotkey → initials input modal appears
- [ ] Type 2-letter initials (e.g., "LJ")
- [ ] Press Enter → schedule generated
- [ ] Sports alias assigned (e.g., "LeBron James")
- [ ] Appointments created in database
- [ ] Preview overlay opens automatically

### Custom Wizard (Hotkey 1) [BUILT]
- [ ] Step 1: Select or name a template
- [ ] Step 2: Enter patient initials
- [ ] Step 3: Choose start date
- [ ] Step 4: Set frequency (sessions/week) and duration (weeks)
- [ ] Step 5: Set default appointment time
- [ ] Step 6: Review all details and confirm
- [ ] Back button works at each step
- [ ] Escape closes wizard

### All 6 Templates [BUILT]
- [ ] Template 2: Post-Op Knee Rehab (3x/wk, 8 wks = 24 appointments)
- [ ] Template 3: Shoulder Recovery (3x/wk, 6 wks = 18 appointments)
- [ ] Template 4: Low Back Pain Program (2x/wk, 4 wks = 8 appointments)
- [ ] Template 5: Sports Injury Rehab (3x/wk, 4 wks = 12 appointments)
- [ ] Template 6: Balance & Fall Prevention (2x/wk, 12 wks = 24 appointments)
- [ ] Custom Wizard (1): User-defined parameters

---

## 4. Schedule Preview

### Table View [BUILT]
- [ ] Appointments displayed in table format
- [ ] Columns: Week #, Date, Time, Provider, Reminder
- [ ] Grouped by week
- [ ] Scrollable for long schedules

### Calendar View [BUILT]
- [ ] FullCalendar renders with appointments
- [ ] Month/week/day views available
- [ ] Appointments show as events on correct dates
- [ ] Click event → shows appointment details

### Print Preview [BUILT]
- [ ] Print button triggers window.print()
- [ ] Print-optimized CSS hides UI elements
- [ ] Clinic header appears if configured
- [ ] Logo appears if uploaded
- [ ] Notes section appears if enabled in print settings

### Schedule Delete [PLANNED — Iteration 1]
- [ ] Delete button visible in preview overlay
- [ ] Confirmation dialog before deletion
- [ ] Schedule and appointments removed from database
- [ ] Overlay closes, dashboard refreshes

---

## 5. Profile

### View Profile [BUILT]
- [ ] Email displayed
- [ ] Tier displayed (free/paid)
- [ ] Account status displayed

### Edit Clinic Info [BUILT]
- [ ] Edit clinic name
- [ ] Edit clinic address
- [ ] Edit clinic phone
- [ ] Edit clinic email
- [ ] Save button → PUT /api/v1/profile
- [ ] Success message shown

### Logo Upload [PLANNED — Iteration 1]
- [ ] File input accepts PNG/JPEG only
- [ ] Client-side size validation (500KB max)
- [ ] Upload preview thumbnail
- [ ] Logo appears in print preview header
- [ ] Remove logo button

### Account Deletion [PLANNED — Iteration 1]
- [ ] "Delete Account" button in danger zone
- [ ] Confirmation: user types "DELETE"
- [ ] All data cascade-deleted (schedules, appointments, templates, profile)
- [ ] Logged out and redirected to /login
- [ ] Audit log entry created

---

## 6. Templates

### View Templates [BUILT]
- [ ] Template editor page lists all user templates
- [ ] Shows: name, hotkey, sessions/week, duration, active status

### Edit Templates [BUILT]
- [ ] Change template name
- [ ] Change sessions per week (1-7)
- [ ] Change duration (1-52 weeks)
- [ ] Change default time
- [ ] Toggle active/inactive
- [ ] Save → PUT /api/v1/templates/:id

### Create Template [PLANNED — Iteration 3]
- [ ] "Add Template" button
- [ ] Assign to unused hotkey (7-9)
- [ ] Set name, frequency, duration, time
- [ ] 409 error if hotkey already in use

### Delete Template [PLANNED — Iteration 3]
- [ ] Delete button per template
- [ ] Confirmation dialog
- [ ] Schedules with this template keep their data (template_id → NULL)

---

## 7. Export

### PDF Download [PLANNED — Iteration 4]
- [ ] "Download PDF" button in schedule preview
- [ ] PDF matches print layout (header, logo, table, notes)
- [ ] File name: [alias]-schedule-[date].pdf
- [ ] Works offline after page load

### Calendar Export (.ics) [PLANNED — Iteration 4]
- [ ] "Export to Calendar" button in schedule preview
- [ ] Valid iCalendar file generated
- [ ] One VEVENT per appointment
- [ ] File name: [alias]-appointments.ics
- [ ] Imports correctly into Google Calendar
- [ ] Imports correctly into Outlook
- [ ] Imports correctly into Apple Calendar

---

## 8. Admin Panel

### User Management [BUILT]
- [ ] List all users with status, role, tier, created date
- [ ] Pending users highlighted
- [ ] Approve button → user status changes to "approved"
- [ ] Deny button → user status changes to "denied"
- [ ] Email sent to user on approve/deny

### Audit Log [BUILT]
- [ ] View recent admin actions
- [ ] Shows: action, user, IP, timestamp
- [ ] Actions logged: login, code sent, code failed, verified, approve, deny

### Admin Stats [PLANNED — Iteration 6]
- [ ] Total users count
- [ ] Active users (last 7 days)
- [ ] Total schedules created
- [ ] Schedules created this week
- [ ] Popular templates

---

## 9. Security

### CSRF Protection [BUILT]
- [ ] csrf_token cookie set on login
- [ ] X-CSRF-Token header required on POST/PUT/PATCH/DELETE
- [ ] Missing header → 403 Forbidden
- [ ] Invalid token → 403 Forbidden
- [ ] Token is HMAC-SHA256 signed

### JWT Session Security [BUILT]
- [ ] Tokens stored in httpOnly cookies (not accessible via JavaScript)
- [ ] Secure flag set (HTTPS only)
- [ ] SameSite=Lax set
- [ ] Access token expires in 1 hour
- [ ] Refresh token expires in 7 days
- [ ] Invalid token → 401 Unauthorized

### Rate Limiting [BUILT]
- [ ] /auth/firebase: max 10 req/min
- [ ] /auth/refresh: max 20 req/min
- [ ] /admin/login: max 5 req/min
- [ ] /admin/send-code: max 3 req/min
- [ ] /admin/verify-code: max 5 req/min
- [ ] Exceeded → 429 Too Many Requests

### Security Headers [BUILT]
- [ ] Content-Security-Policy present and restrictive
- [ ] Strict-Transport-Security: max-age=63072000 (2 years)
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()

### Input Validation [BUILT]
- [ ] All API inputs validated with Zod schemas
- [ ] SQL injection impossible (parameterized queries only)
- [ ] XSS prevented (no dangerouslySetInnerHTML, CSP blocks inline scripts)
- [ ] Request body size limited to 1MB
- [ ] Template ID validates as 32-char hex: /^[0-9a-f]{32}$/i
- [ ] Logo upload validates magic bytes (PNG: 89504E47, JPEG: FFD8FF)

### CORS [BUILT]
- [ ] Only FRONTEND_URL origin allowed
- [ ] Credentials: true (cookies sent cross-origin)
- [ ] Direct Worker URL access blocked in production

### Bot Protection [BUILT]
- [ ] Cloudflare Turnstile widget on auth forms
- [ ] Token verified server-side via Turnstile API
- [ ] Test key used in development (always passes)

---

## 10. API Health

### Health Check [BUILT]
- [ ] GET /api/v1/health returns `{ ok: true }` with 200 status
- [ ] Response time < 50ms

### Error Handling [BUILT]
- [ ] Unknown routes → 404 `{ ok: false, error: { code: 'NOT_FOUND' } }`
- [ ] Unhandled errors → 500 `{ ok: false, error: { code: 'INTERNAL_ERROR' } }`
- [ ] Auth required → 401 `{ ok: false, error: { code: 'UNAUTHORIZED' } }`
- [ ] CSRF missing → 403 `{ ok: false, error: { code: 'CSRF_MISSING' } }`
- [ ] Rate limited → 429 `{ ok: false, error: { code: 'RATE_LIMITED' } }`
- [ ] Payload too large → 413 `{ ok: false, error: { code: 'PAYLOAD_TOO_LARGE' } }`

---

## 11. Cross-Browser Testing

### Desktop Browsers
- [ ] Chrome 90+ (primary development browser)
- [ ] Firefox 90+
- [ ] Safari 15+
- [ ] Edge 90+

### Mobile Browsers
- [ ] iOS Safari 15+
- [ ] Chrome for Android
- [ ] Responsive layout at 320px width
- [ ] Responsive layout at 768px width
- [ ] Responsive layout at 1024px width

---

## 12. Accessibility

### Keyboard Navigation [BUILT]
- [ ] Tab order follows logical reading order
- [ ] All interactive elements reachable via Tab
- [ ] Hotkeys 1-6 work on dashboard
- [ ] Enter submits forms
- [ ] Escape closes modals/overlays

### Screen Reader [BUILT]
- [ ] Skip-to-main-content link present
- [ ] Form inputs have associated labels
- [ ] Error messages announced
- [ ] ARIA roles on modal overlays
- [ ] Images have alt text

### Focus Management [BUILT]
- [ ] Focus trapped in modal overlays
- [ ] Focus returns to trigger element when modal closes
- [ ] Focus visible indicator on all interactive elements
- [ ] No focus loss during page transitions

### Color Contrast [BUILT]
- [ ] Green (#2d6a4f) on white: ratio ≥ 4.5:1 (AA)
- [ ] Orange (#e76f51) on white: verify ratio meets AA
- [ ] Text on dark backgrounds: verify ratio ≥ 4.5:1
- [ ] Error text clearly distinguishable (not color-only indication)

---

## 13. Error Boundaries [PLANNED — Iteration 2]

- [ ] React ErrorBoundary wraps all routes
- [ ] Render error shows "Something went wrong" fallback
- [ ] Refresh button reloads the page
- [ ] Error logged to console with component stack
- [ ] One page crash doesn't break navigation to other pages

---

## 14. Structured API Logging [PLANNED — Iteration 2]

- [ ] All API errors logged as JSON: { error, path, method, timestamp }
- [ ] Consistent format across all route catch blocks
- [ ] Visible in Cloudflare Workers dashboard logs

---

## 15. Database Backups [PLANNED — Iteration 5]

- [ ] Automated backup runs daily
- [ ] Backup stored in R2 bucket or Time Travel enabled
- [ ] Restore procedure documented and tested
- [ ] Backup retention: 30 days minimum

---

## 16. Daily Digest Email [PLANNED — Iteration 5]

- [ ] Cron trigger runs daily (7 AM UTC)
- [ ] Email sent to PT's clinic_email
- [ ] Lists tomorrow's appointments: alias, time
- [ ] No email sent if no appointments tomorrow
- [ ] Respects Resend rate limits

---

*Check each box as you verify. Run this checklist after every deployment.*
