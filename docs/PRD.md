# PTOWL Product Requirements Document (PRD)

**Document Version:** 1.0
**Last Updated:** 2026-03-16
**Author:** PTOWL Development Team
**Status:** Approved

---

## 1. Product Overview

**Product Name:** PTOWL
**URL:** https://ptowl.com
**Tagline:** "3 keys. Schedule done. Go home on time."

PTOWL is a web-based PT schedule generator that creates complete appointment schedules in 3 keypresses. It serves individual Physical Therapists and small clinic staff who need fast, reliable scheduling without the overhead of a full EMR system.

---

## 2. Feature Inventory

### 2.1 Features — As Built [LIVE]

#### Authentication & Authorization
| Feature | Status | Details |
|---------|--------|---------|
| Google Sign-In (Firebase) | [BUILT] | One-click Google OAuth via Firebase Auth SDK |
| Phone SMS Auth (Firebase) | [BUILT] | SMS verification code flow |
| Admin email/password login | [BUILT] | PBKDF2-SHA256 (100K iterations, 16-byte salt) |
| Admin 2FA (email codes) | [BUILT] | 6-digit codes via Resend, 5-minute expiry |
| JWT sessions (httpOnly cookies) | [BUILT] | HS256, 1-hour access + 7-day refresh tokens |
| Signed CSRF tokens | [BUILT] | HMAC-SHA256, validated on all state-changing requests |
| User approval workflow | [BUILT] | Admin manually approves/denies new registrations |
| Account linking | [BUILT] | Google + Phone providers linked to single account |
| Logout (cookie clearing) | [BUILT] | Clears access + refresh cookies |

#### Dashboard
| Feature | Status | Details |
|---------|--------|---------|
| Template cards (hotkeys 2-6) | [BUILT] | 5 preset templates displayed as selectable cards |
| Custom Wizard card (hotkey 1) | [BUILT] | Opens 6-step keyboard-driven schedule wizard |
| Saved schedules list | [BUILT] | Paginated list of user's created schedules (20/page) |
| Schedule preview overlay | [BUILT] | 666-line overlay with table + calendar views |
| Keyboard hotkey shortcuts | [BUILT] | Press 1-6 to select template, enter initials, confirm |
| Owl logo with 270-degree rotation | [BUILT] | Animated owl mascot on hover |

#### Schedule Generation
| Feature | Status | Details |
|---------|--------|---------|
| 3-keypress workflow | [BUILT] | Select template (1 key) → Enter initials (2 keys) → Confirm |
| 6-step custom wizard | [BUILT] | Template, patient, dates, frequency, time, review |
| 5 preset templates | [BUILT] | Post-Op Knee, Shoulder Recovery, Low Back Pain, Sports Injury, Balance & Fall Prevention |
| Sports alias PII protection | [BUILT] | 676 initials → sports figures (e.g., "LJ" → "LeBron James") |
| Appointment date generation | [BUILT] | Auto-generates dates based on frequency + duration + excluded weekends |
| Table view | [BUILT] | Weekly appointment table with date, time, provider, reminder columns |
| Calendar view (FullCalendar) | [BUILT] | Interactive calendar with appointment overlays |
| Print preview | [BUILT] | Browser window.print() with print-optimized CSS |
| Print settings | [BUILT] | localStorage: default view, show header, notes, reminder column |

#### Profile & Settings
| Feature | Status | Details |
|---------|--------|---------|
| View profile (email, tier) | [BUILT] | Displays user info and account status |
| Edit clinic info | [BUILT] | Clinic name, address, phone, email |
| Customize page | [BUILT] | Hub for template editor + print settings |

#### Admin Panel
| Feature | Status | Details |
|---------|--------|---------|
| User management | [BUILT] | Approve/deny pending users, view all users |
| Audit log | [BUILT] | Tracks admin actions: login, code sent, user approval/denial |
| Email notifications | [BUILT] | Admin notified via email on new signups |

#### Legal & Compliance Pages
| Feature | Status | Details |
|---------|--------|---------|
| Privacy Policy (/privacy) | [BUILT] | Full privacy policy page |
| Terms of Service (/terms) | [BUILT] | Full terms page |
| Security Overview (/security) | [BUILT] | Public-facing security architecture overview |

#### Infrastructure & Security
| Feature | Status | Details |
|---------|--------|---------|
| 7 security layers | [BUILT] | WAF, CORS, headers, rate limit, auth, authz, validation |
| Cloudflare Turnstile | [BUILT] | Bot protection on auth endpoints |
| Rate limiting (per IP) | [BUILT] | Sliding window: 3-20 req/min per endpoint |
| CSP headers | [BUILT] | Strict Content-Security-Policy |
| HSTS (2 years + preload) | [BUILT] | Strict-Transport-Security |
| CI/CD (Cloud Build) | [BUILT] | Auto test + build + deploy on push to main |
| 692 automated tests | [BUILT] | 130 shared + 488 API + 74 web |

---

### 2.2 Features — Planned [ROADMAP]

#### Iteration 1: Complete Half-Built Features
| Feature | Status | Priority | Details |
|---------|--------|----------|---------|
| Schedule delete button | [PLANNED] | High | API exists, needs UI button in overlay |
| Logo upload UI | [PLANNED] | High | API exists, needs file input on ProfilePage |
| Account deletion | [PLANNED] | Critical | Privacy policy promises it, legal obligation |

#### Iteration 2: Operational Safety
| Feature | Status | Priority | Details |
|---------|--------|----------|---------|
| React error boundaries | [PLANNED] | High | Catch render errors, show fallback UI |
| Structured API logging | [PLANNED] | Medium | JSON error logs for Cloudflare dashboard |

#### Iteration 3: Template CRUD
| Feature | Status | Priority | Details |
|---------|--------|----------|---------|
| Create custom template | [PLANNED] | High | POST endpoint, assign to hotkeys 7-9 |
| Delete template | [PLANNED] | Medium | DELETE endpoint, free up hotkey slot |

#### Iteration 4: Export
| Feature | Status | Priority | Details |
|---------|--------|----------|---------|
| PDF export | [PLANNED] | High | Client-side jsPDF, matches print layout |
| Calendar export (.ics) | [PLANNED] | Medium | iCalendar file for Google/Outlook import |

#### Iteration 5: Backend Operations
| Feature | Status | Priority | Details |
|---------|--------|----------|---------|
| D1 database backups | [PLANNED] | High | Cron trigger, R2 bucket or Time Travel |
| Daily digest email | [PLANNED] | Medium | Tomorrow's appointments sent to PT's email |

#### Iteration 6: Analytics & Cleanup
| Feature | Status | Priority | Details |
|---------|--------|----------|---------|
| Admin stats dashboard | [PLANNED] | Low | Usage metrics in admin panel |
| Dead code cleanup | [PLANNED] | Low | Remove unused tables, deps, components |

#### Future Phases (Not Yet Scoped)
| Feature | Status | Details |
|---------|--------|---------|
| LemonSqueezy integration | [FUTURE] | License keys, checkout, subscription management |
| SMS reminders (Telnyx) | [FUTURE] | Opt-in, $0.008/SMS, 10DLC registration |
| Waitlist management | [FUTURE] | Notify on cancellation, auto-fill |
| No-show tracking | [FUTURE] | Basic stats dashboard card |
| AI schedule suggestions | [FUTURE] | Optimal time slots based on patterns |
| Multi-provider calendar | [FUTURE] | Clinic-wide view for owners |
| Patient self-booking | [FUTURE] | Patient-facing booking portal |
| Zapier/webhook integrations | [FUTURE] | External service connectivity |

---

## 3. User Flows

### 3.1 New User Registration Flow
```
1. User visits ptowl.com → redirected to /login
2. Clicks "Sign in with Google" or enters phone number
3. Firebase Auth handles OAuth/SMS verification
4. PTOWL backend receives Firebase token → POST /api/v1/auth/firebase
5. Backend creates user (status: pending) + profile + 5 default templates
6. Admin notified via email
7. User sees "Pending Approval" page
8. Admin approves → user redirected to /dashboard on next login
```

### 3.2 Schedule Creation Flow (3-Keypress)
```
1. User presses hotkey 2-6 on dashboard (selects template)
2. Modal appears → user types 2-letter patient initials (e.g., "LJ")
3. System maps "LJ" → "LeBron James" (sports alias)
4. User presses Enter to confirm
5. Schedule generated: dates calculated, appointments created in D1
6. Preview overlay opens with table view
7. User can switch to calendar view, print, or close
```

### 3.3 Custom Schedule Flow (Hotkey 1)
```
1. User presses hotkey 1 → Custom Wizard opens
2. Step 1: Select or name a template
3. Step 2: Enter patient initials
4. Step 3: Choose start date
5. Step 4: Set frequency (sessions/week) and duration (weeks)
6. Step 5: Set default appointment time
7. Step 6: Review and confirm
8. Schedule generated and preview opens
```

### 3.4 Admin User Approval Flow
```
1. New user registers → status = "pending"
2. Admin receives email notification
3. Admin logs in → /admin (email + password + 2FA code)
4. Admin sees pending users list
5. Admin clicks Approve or Deny
6. User notified via email of decision
7. Approved users can access /dashboard on next login
```

---

## 4. UX Conventions

### Color System
| Color | CSS Variable | Usage |
|-------|-------------|-------|
| Green (#2d6a4f) | --green-700 | Safe, OK, success states |
| Orange (#e76f51) | --orange-500 | Attention, action needed |
| Gray (#6c757d) | --gray-500 | Neutral, secondary text |
| White (#ffffff) | --white | Backgrounds |
| Near-black (#1a1a2e) | --dark-bg | Dark sections |

### Interaction Patterns
- **Keyboard-first**: Hotkeys 1-6 for template selection, Enter to confirm
- **Inline styles**: `Record<string, React.CSSProperties>` pattern used in pages
- **Loading states**: `LoadingOverlay` component with message prop
- **Error display**: Inline error messages below form fields
- **Modals**: Focus-trapped overlays with Escape to close
- **Print**: Dedicated print CSS with hidden UI elements

### Branding
- Owl mascot with 270-degree head rotation on hover animation
- Product feel: Clean, clinical, fast, trustworthy
- Marketing feel: Sports humor, owl personality, memorable template names
- Font: System font stack (no custom web fonts for performance)

---

## 5. Tier Definitions

### Free Tier (Current — All Users)
| Capability | Limit |
|-----------|-------|
| Templates | 5 presets + up to 4 custom (hotkeys 1-9) |
| Schedules | Unlimited |
| Appointments per schedule | Unlimited |
| Print preview | Yes |
| Calendar view | Yes |
| Logo upload | Yes (500KB max) |

### Premium Tier (Future — Post-Monetization)
| Capability | Limit |
|-----------|-------|
| Everything in Free | Yes |
| PDF export | Yes |
| Calendar sync (.ics) | Yes |
| Email reminders | Yes |
| SMS reminders (opt-in) | Yes |
| Priority support | Yes |

---

## 6. Non-Functional Requirements

### 6.1 Security
- **Authentication**: Firebase Auth (Google + Phone) for users, email/password for admin
- **Session management**: JWT in httpOnly Secure SameSite=Lax cookies
- **CSRF protection**: HMAC-SHA256 signed tokens on all state-mutating requests
- **Input validation**: Zod schemas on all API inputs (shared package)
- **Rate limiting**: Per-IP sliding window on auth endpoints (3-20 req/min)
- **Headers**: CSP, HSTS (2yr + preload), X-Frame-Options DENY, nosniff, Permissions-Policy
- **Bot protection**: Cloudflare Turnstile on auth endpoints
- **Password hashing**: PBKDF2-SHA256, 100K iterations, 16-byte random salt (admin only)
- **PII protection**: Sports alias system — no real patient names stored

### 6.2 Performance
- **Page load**: <2 seconds on 3G connection (code splitting + lazy loading)
- **API response**: <200ms P95 for read operations
- **Schedule generation**: <500ms including DB writes
- **Bundle size**: Critical path (login + dashboard) in main bundle; 13 routes lazy-loaded

### 6.3 Accessibility (WCAG 2.1 AA Target)
- Skip-to-main-content link
- ARIA labels on interactive elements
- Focus traps in modal overlays
- Keyboard navigation for all workflows
- Color contrast ratios meeting AA standards
- Screen reader compatible form labels and error messages

### 6.4 Browser Support
- Chrome 90+ (primary)
- Firefox 90+
- Safari 15+
- Edge 90+
- Mobile: iOS Safari 15+, Chrome for Android

### 6.5 Availability
- Target: 99.9% uptime (Cloudflare infrastructure)
- Graceful degradation: email failures don't block registration
- No single points of failure (Cloudflare global edge network)

---

## 7. Routes & Pages

| Route | Page | Auth Required | Description |
|-------|------|--------------|-------------|
| /login | LoginPage | No | Google/Phone sign-in |
| /register | RegisterPage | No | Alternative registration flow |
| /forgot-password | ForgotPasswordPage | No | Password reset request |
| /reset-password | ResetPasswordPage | No | Password reset completion |
| /pending | PendingPage | Yes | Awaiting admin approval |
| /dashboard | DashboardPage | Yes | Main hub: templates + schedules |
| /schedule/:id | SchedulePage | Yes | Individual schedule view |
| /customize | CustomizePage | Yes | Settings hub |
| /customize/templates | TemplateEditorPage | Yes | Edit template properties |
| /customize/print | PrintSettingsPage | Yes | Print preferences |
| /profile | ProfilePage | Yes | User profile + clinic info |
| /admin | AdminPage | Admin | User management + audit log |
| /privacy | PrivacyPolicyPage | No | Privacy policy |
| /terms | TermsOfServicePage | No | Terms of service |
| /security | SecurityPage | No | Security overview |
| / | Redirect → /dashboard | — | Root redirect |
| * | NotFoundPage | No | 404 page |

---

## 8. API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/v1/health | None | Health check |
| POST | /api/v1/auth/firebase | None | Firebase token → PTOWL JWT |
| POST | /api/v1/auth/logout | User | Clear session cookies |
| POST | /api/v1/auth/refresh | User | Refresh JWT tokens |
| GET | /api/v1/auth/me | User | Get current user + profile |
| GET | /api/v1/schedules | User | List schedules (paginated) |
| POST | /api/v1/schedules | User + CSRF | Create schedule + appointments |
| GET | /api/v1/schedules/:id | User | Get schedule with appointments |
| DELETE | /api/v1/schedules/:id | User + CSRF | Delete schedule + appointments |
| GET | /api/v1/templates | User | List user's templates |
| PUT | /api/v1/templates/:id | User + CSRF | Update template properties |
| PATCH | /api/v1/appointments/:id | User + CSRF | Update appointment (time, provider, reminder) |
| GET | /api/v1/profile | User | Get clinic profile |
| PUT | /api/v1/profile | User + CSRF | Update clinic info |
| POST | /api/v1/profile/logo | User + CSRF | Upload clinic logo (base64) |
| GET | /api/v1/alias | User | Get sports alias for initials |
| POST | /api/v1/admin/login | None | Admin email/password login |
| POST | /api/v1/admin/send-code | Admin | Request 2FA email code |
| POST | /api/v1/admin/verify-code | Admin | Verify 2FA code |
| GET | /api/v1/admin/users | Admin | List all users |
| POST | /api/v1/admin/approve/:id | Admin + CSRF | Approve pending user |
| POST | /api/v1/admin/deny/:id | Admin + CSRF | Deny pending user |

---

*This document is maintained alongside the codebase and updated as product requirements evolve.*
