const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, LevelFormat
} = require("docx");

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };
const headerShading = { fill: "2D6A4F", type: ShadingType.CLEAR };
const headerRun = { bold: true, color: "FFFFFF", font: "Arial", size: 20 };
const bodyRun = { font: "Arial", size: 20 };
const boldRun = { font: "Arial", size: 20, bold: true };

function makeHeaderCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: headerShading, margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ ...headerRun, text })] })]
  });
}

function makeCell(text, width, opts = {}) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ ...boldRun, text: part.slice(2, -2) }));
    } else {
      runs.push(new TextRun({ ...bodyRun, text: part }));
    }
  }
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    margins: cellMargins, shading: opts.shading,
    children: [new Paragraph({ children: runs })]
  });
}

function makeTable(headers, rows, colWidths) {
  const totalWidth = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => makeHeaderCell(h, colWidths[i])) }),
      ...rows.map(row => new TableRow({
        children: row.map((cell, i) => makeCell(cell, colWidths[i]))
      }))
    ]
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 32, color: "2D6A4F" })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 26, color: "2D6A4F" })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 },
    children: [new TextRun({ text, bold: true, font: "Arial", size: 22, color: "333333" })] });
}
function para(text, opts = {}) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ ...boldRun, text: part.slice(2, -2) }));
    } else {
      runs.push(new TextRun({ ...bodyRun, text: part }));
    }
  }
  return new Paragraph({ spacing: { after: 120 }, ...opts, children: runs });
}
function bullet(text, ref, level = 0) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ ...boldRun, text: part.slice(2, -2) }));
    } else {
      runs.push(new TextRun({ ...bodyRun, text: part }));
    }
  }
  return new Paragraph({ numbering: { reference: ref, level }, spacing: { after: 60 }, children: runs });
}
function numbered(text, ref, level = 0) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ ...boldRun, text: part.slice(2, -2) }));
    } else {
      runs.push(new TextRun({ ...bodyRun, text: part }));
    }
  }
  return new Paragraph({ numbering: { reference: ref, level }, spacing: { after: 60 }, children: runs });
}
function codeBlock(lines) {
  return lines.map(line => new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text: line, font: "Consolas", size: 18, color: "333333" })]
  }));
}

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }
      ]},
      { reference: "numbers1", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
    ]
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "2D6A4F" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2D6A4F" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "2D6A4F", space: 1 } },
          children: [new TextRun({ text: "PTOWL Product Requirements Document", font: "Arial", size: 16, color: "999999" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 1 } },
          children: [
            new TextRun({ text: "PTOWL PRD v1.0  |  Page ", font: "Arial", size: 16, color: "999999" }),
            new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16, color: "999999" }),
          ]
        })]
      })
    },
    children: [
      // Title page
      new Paragraph({ spacing: { before: 3600 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: "PTOWL", font: "Arial", size: 72, bold: true, color: "2D6A4F" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
        children: [new TextRun({ text: "Product Requirements Document", font: "Arial", size: 36, color: "666666" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "Version 1.0  |  March 16, 2026", font: "Arial", size: 22, color: "999999" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "Status: Approved", font: "Arial", size: 22, color: "2D6A4F", bold: true })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // Section 1: Product Overview
      h1("1. Product Overview"),
      para("**Product Name:** PTOWL"),
      para("**URL:** https://ptowl.com"),
      para('**Tagline:** "3 keys. Schedule done. Go home on time."'),
      para("PTOWL is a web-based PT schedule generator that creates complete appointment schedules in 3 keypresses. It serves individual Physical Therapists and small clinic staff who need fast, reliable scheduling without the overhead of a full EMR system."),

      // Section 2: Feature Inventory
      new Paragraph({ children: [new PageBreak()] }),
      h1("2. Feature Inventory"),
      h2("2.1 Features \u2014 As Built [LIVE]"),

      h3("Authentication & Authorization"),
      makeTable(
        ["Feature", "Status", "Details"],
        [
          ["Google Sign-In (Firebase)", "[BUILT]", "One-click Google OAuth via Firebase Auth SDK"],
          ["Phone SMS Auth (Firebase)", "[BUILT]", "SMS verification code flow"],
          ["Admin email/password login", "[BUILT]", "PBKDF2-SHA256 (100K iterations, 16-byte salt)"],
          ["Admin 2FA (email codes)", "[BUILT]", "6-digit codes via Resend, 5-minute expiry"],
          ["JWT sessions (httpOnly cookies)", "[BUILT]", "HS256, 1-hour access + 7-day refresh tokens"],
          ["Signed CSRF tokens", "[BUILT]", "HMAC-SHA256, validated on all state-changing requests"],
          ["User approval workflow", "[BUILT]", "Admin manually approves/denies new registrations"],
          ["Account linking", "[BUILT]", "Google + Phone providers linked to single account"],
          ["Logout (cookie clearing)", "[BUILT]", "Clears access + refresh cookies"],
        ],
        [3000, 1500, 4860]
      ),

      h3("Dashboard"),
      makeTable(
        ["Feature", "Status", "Details"],
        [
          ["Template cards (hotkeys 2-6)", "[BUILT]", "5 preset templates displayed as selectable cards"],
          ["Custom Wizard card (hotkey 1)", "[BUILT]", "Opens 6-step keyboard-driven schedule wizard"],
          ["Saved schedules list", "[BUILT]", "Paginated list of user's created schedules (20/page)"],
          ["Schedule preview overlay", "[BUILT]", "666-line overlay with table + calendar views"],
          ["Keyboard hotkey shortcuts", "[BUILT]", "Press 1-6 to select template, enter initials, confirm"],
          ["Owl logo with 270-degree rotation", "[BUILT]", "Animated owl mascot on hover"],
        ],
        [3000, 1500, 4860]
      ),

      h3("Schedule Generation"),
      makeTable(
        ["Feature", "Status", "Details"],
        [
          ["3-keypress workflow", "[BUILT]", "Select template (1 key) \u2192 Enter initials (2 keys) \u2192 Confirm"],
          ["6-step custom wizard", "[BUILT]", "Template, patient, dates, frequency, time, review"],
          ["5 preset templates", "[BUILT]", "Post-Op Knee, Shoulder Recovery, Low Back Pain, Sports Injury, Balance & Fall Prevention"],
          ["Sports alias PII protection", "[BUILT]", '676 initials \u2192 sports figures (e.g., "LJ" \u2192 "LeBron James")'],
          ["Appointment date generation", "[BUILT]", "Auto-generates dates based on frequency + duration + excluded weekends"],
          ["Table view", "[BUILT]", "Weekly appointment table with date, time, provider, reminder columns"],
          ["Calendar view (FullCalendar)", "[BUILT]", "Interactive calendar with appointment overlays"],
          ["Print preview", "[BUILT]", "Browser window.print() with print-optimized CSS"],
          ["Print settings", "[BUILT]", "localStorage: default view, show header, notes, reminder column"],
        ],
        [3000, 1500, 4860]
      ),

      h3("Profile & Settings"),
      makeTable(
        ["Feature", "Status", "Details"],
        [
          ["View profile (email, tier)", "[BUILT]", "Displays user info and account status"],
          ["Edit clinic info", "[BUILT]", "Clinic name, address, phone, email"],
          ["Customize page", "[BUILT]", "Hub for template editor + print settings"],
        ],
        [3000, 1500, 4860]
      ),

      h3("Admin Panel"),
      makeTable(
        ["Feature", "Status", "Details"],
        [
          ["User management", "[BUILT]", "Approve/deny pending users, view all users"],
          ["Audit log", "[BUILT]", "Tracks admin actions: login, code sent, user approval/denial"],
          ["Email notifications", "[BUILT]", "Admin notified via email on new signups"],
        ],
        [3000, 1500, 4860]
      ),

      h3("Legal & Compliance Pages"),
      makeTable(
        ["Feature", "Status", "Details"],
        [
          ["Privacy Policy (/privacy)", "[BUILT]", "Full privacy policy page"],
          ["Terms of Service (/terms)", "[BUILT]", "Full terms page"],
          ["Security Overview (/security)", "[BUILT]", "Public-facing security architecture overview"],
        ],
        [3000, 1500, 4860]
      ),

      h3("Infrastructure & Security"),
      makeTable(
        ["Feature", "Status", "Details"],
        [
          ["7 security layers", "[BUILT]", "WAF, CORS, headers, rate limit, auth, authz, validation"],
          ["Cloudflare Turnstile", "[BUILT]", "Bot protection on auth endpoints"],
          ["Rate limiting (per IP)", "[BUILT]", "Sliding window: 3-20 req/min per endpoint"],
          ["CSP headers", "[BUILT]", "Strict Content-Security-Policy"],
          ["HSTS (2 years + preload)", "[BUILT]", "Strict-Transport-Security"],
          ["CI/CD (Cloud Build)", "[BUILT]", "Auto test + build + deploy on push to main"],
          ["692 automated tests", "[BUILT]", "130 shared + 488 API + 74 web"],
        ],
        [3000, 1500, 4860]
      ),

      // 2.2 Planned features
      new Paragraph({ children: [new PageBreak()] }),
      h2("2.2 Features \u2014 Planned [ROADMAP]"),

      h3("Iteration 1: Complete Half-Built Features"),
      makeTable(
        ["Feature", "Status", "Priority", "Details"],
        [
          ["Schedule delete button", "[PLANNED]", "High", "API exists, needs UI button in overlay"],
          ["Logo upload UI", "[PLANNED]", "High", "API exists, needs file input on ProfilePage"],
          ["Account deletion", "[PLANNED]", "Critical", "Privacy policy promises it, legal obligation"],
        ],
        [2400, 1200, 1200, 4560]
      ),

      h3("Iteration 2: Operational Safety"),
      makeTable(
        ["Feature", "Status", "Priority", "Details"],
        [
          ["React error boundaries", "[PLANNED]", "High", "Catch render errors, show fallback UI"],
          ["Structured API logging", "[PLANNED]", "Medium", "JSON error logs for Cloudflare dashboard"],
        ],
        [2400, 1200, 1200, 4560]
      ),

      h3("Iteration 3: Template CRUD"),
      makeTable(
        ["Feature", "Status", "Priority", "Details"],
        [
          ["Create custom template", "[PLANNED]", "High", "POST endpoint, assign to hotkeys 7-9"],
          ["Delete template", "[PLANNED]", "Medium", "DELETE endpoint, free up hotkey slot"],
        ],
        [2400, 1200, 1200, 4560]
      ),

      h3("Iteration 4: Export"),
      makeTable(
        ["Feature", "Status", "Priority", "Details"],
        [
          ["PDF export", "[PLANNED]", "High", "Client-side jsPDF, matches print layout"],
          ["Calendar export (.ics)", "[PLANNED]", "Medium", "iCalendar file for Google/Outlook import"],
        ],
        [2400, 1200, 1200, 4560]
      ),

      h3("Iteration 5: Backend Operations"),
      makeTable(
        ["Feature", "Status", "Priority", "Details"],
        [
          ["D1 database backups", "[PLANNED]", "High", "Cron trigger, R2 bucket or Time Travel"],
          ["Daily digest email", "[PLANNED]", "Medium", "Tomorrow's appointments sent to PT's email"],
        ],
        [2400, 1200, 1200, 4560]
      ),

      h3("Iteration 6: Analytics & Cleanup"),
      makeTable(
        ["Feature", "Status", "Priority", "Details"],
        [
          ["Admin stats dashboard", "[PLANNED]", "Low", "Usage metrics in admin panel"],
          ["Dead code cleanup", "[PLANNED]", "Low", "Remove unused tables, deps, components"],
        ],
        [2400, 1200, 1200, 4560]
      ),

      h3("Future Phases (Not Yet Scoped)"),
      makeTable(
        ["Feature", "Status", "Details"],
        [
          ["LemonSqueezy integration", "[FUTURE]", "License keys, checkout, subscription management"],
          ["SMS reminders (Telnyx)", "[FUTURE]", "Opt-in, $0.008/SMS, 10DLC registration"],
          ["Waitlist management", "[FUTURE]", "Notify on cancellation, auto-fill"],
          ["No-show tracking", "[FUTURE]", "Basic stats dashboard card"],
          ["AI schedule suggestions", "[FUTURE]", "Optimal time slots based on patterns"],
          ["Multi-provider calendar", "[FUTURE]", "Clinic-wide view for owners"],
          ["Patient self-booking", "[FUTURE]", "Patient-facing booking portal"],
          ["Zapier/webhook integrations", "[FUTURE]", "External service connectivity"],
        ],
        [3000, 1500, 4860]
      ),

      // Section 3: User Flows
      new Paragraph({ children: [new PageBreak()] }),
      h1("3. User Flows"),

      h2("3.1 New User Registration Flow"),
      numbered("User visits ptowl.com \u2192 redirected to /login", "numbers1"),
      numbered('Clicks "Sign in with Google" or enters phone number', "numbers1"),
      numbered("Firebase Auth handles OAuth/SMS verification", "numbers1"),
      numbered("PTOWL backend receives Firebase token \u2192 POST /api/v1/auth/firebase", "numbers1"),
      numbered("Backend creates user (status: pending) + profile + 5 default templates", "numbers1"),
      numbered("Admin notified via email", "numbers1"),
      numbered('User sees "Pending Approval" page', "numbers1"),
      numbered("Admin approves \u2192 user redirected to /dashboard on next login", "numbers1"),

      h2("3.2 Schedule Creation Flow (3-Keypress)"),
      numbered("User presses hotkey 2-6 on dashboard (selects template)", "numbers1"),
      numbered('Modal appears \u2192 user types 2-letter patient initials (e.g., "LJ")', "numbers1"),
      numbered('System maps "LJ" \u2192 "LeBron James" (sports alias)', "numbers1"),
      numbered("User presses Enter to confirm", "numbers1"),
      numbered("Schedule generated: dates calculated, appointments created in D1", "numbers1"),
      numbered("Preview overlay opens with table view", "numbers1"),
      numbered("User can switch to calendar view, print, or close", "numbers1"),

      h2("3.3 Custom Schedule Flow (Hotkey 1)"),
      numbered("User presses hotkey 1 \u2192 Custom Wizard opens", "numbers1"),
      numbered("Step 1: Select or name a template", "numbers1"),
      numbered("Step 2: Enter patient initials", "numbers1"),
      numbered("Step 3: Choose start date", "numbers1"),
      numbered("Step 4: Set frequency (sessions/week) and duration (weeks)", "numbers1"),
      numbered("Step 5: Set default appointment time", "numbers1"),
      numbered("Step 6: Review and confirm", "numbers1"),
      numbered("Schedule generated and preview opens", "numbers1"),

      h2("3.4 Admin User Approval Flow"),
      numbered('New user registers \u2192 status = "pending"', "numbers1"),
      numbered("Admin receives email notification", "numbers1"),
      numbered("Admin logs in \u2192 /admin (email + password + 2FA code)", "numbers1"),
      numbered("Admin sees pending users list", "numbers1"),
      numbered("Admin clicks Approve or Deny", "numbers1"),
      numbered("User notified via email of decision", "numbers1"),
      numbered("Approved users can access /dashboard on next login", "numbers1"),

      // Section 4: UX Conventions
      new Paragraph({ children: [new PageBreak()] }),
      h1("4. UX Conventions"),
      h2("Color System"),
      makeTable(
        ["Color", "CSS Variable", "Usage"],
        [
          ["Green (#2d6a4f)", "--green-700", "Safe, OK, success states"],
          ["Orange (#e76f51)", "--orange-500", "Attention, action needed"],
          ["Gray (#6c757d)", "--gray-500", "Neutral, secondary text"],
          ["White (#ffffff)", "--white", "Backgrounds"],
          ["Near-black (#1a1a2e)", "--dark-bg", "Dark sections"],
        ],
        [3000, 3000, 3360]
      ),

      h2("Interaction Patterns"),
      bullet("**Keyboard-first**: Hotkeys 1-6 for template selection, Enter to confirm", "bullets"),
      bullet("**Inline styles**: Record<string, React.CSSProperties> pattern used in pages", "bullets"),
      bullet("**Loading states**: LoadingOverlay component with message prop", "bullets"),
      bullet("**Error display**: Inline error messages below form fields", "bullets"),
      bullet("**Modals**: Focus-trapped overlays with Escape to close", "bullets"),
      bullet("**Print**: Dedicated print CSS with hidden UI elements", "bullets"),

      h2("Branding"),
      bullet("Owl mascot with 270-degree head rotation on hover animation", "bullets"),
      bullet("Product feel: Clean, clinical, fast, trustworthy", "bullets"),
      bullet("Marketing feel: Sports humor, owl personality, memorable template names", "bullets"),
      bullet("Font: System font stack (no custom web fonts for performance)", "bullets"),

      // Section 5: Tier Definitions
      h1("5. Tier Definitions"),
      h2("Free Tier (Current \u2014 All Users)"),
      makeTable(
        ["Capability", "Limit"],
        [
          ["Templates", "5 presets + up to 4 custom (hotkeys 1-9)"],
          ["Schedules", "Unlimited"],
          ["Appointments per schedule", "Unlimited"],
          ["Print preview", "Yes"],
          ["Calendar view", "Yes"],
          ["Logo upload", "Yes (500KB max)"],
        ],
        [4680, 4680]
      ),

      h2("Premium Tier (Future \u2014 Post-Monetization)"),
      makeTable(
        ["Capability", "Limit"],
        [
          ["Everything in Free", "Yes"],
          ["PDF export", "Yes"],
          ["Calendar sync (.ics)", "Yes"],
          ["Email reminders", "Yes"],
          ["SMS reminders (opt-in)", "Yes"],
          ["Priority support", "Yes"],
        ],
        [4680, 4680]
      ),

      // Section 6: Non-Functional Requirements
      new Paragraph({ children: [new PageBreak()] }),
      h1("6. Non-Functional Requirements"),

      h2("6.1 Security"),
      bullet("**Authentication**: Firebase Auth (Google + Phone) for users, email/password for admin", "bullets"),
      bullet("**Session management**: JWT in httpOnly Secure SameSite=Lax cookies", "bullets"),
      bullet("**CSRF protection**: HMAC-SHA256 signed tokens on all state-mutating requests", "bullets"),
      bullet("**Input validation**: Zod schemas on all API inputs (shared package)", "bullets"),
      bullet("**Rate limiting**: Per-IP sliding window on auth endpoints (3-20 req/min)", "bullets"),
      bullet("**Headers**: CSP, HSTS (2yr + preload), X-Frame-Options DENY, nosniff, Permissions-Policy", "bullets"),
      bullet("**Bot protection**: Cloudflare Turnstile on auth endpoints", "bullets"),
      bullet("**Password hashing**: PBKDF2-SHA256, 100K iterations, 16-byte random salt (admin only)", "bullets"),
      bullet("**PII protection**: Sports alias system \u2014 no real patient names stored", "bullets"),

      h2("6.2 Performance"),
      bullet("**Page load**: <2 seconds on 3G connection (code splitting + lazy loading)", "bullets"),
      bullet("**API response**: <200ms P95 for read operations", "bullets"),
      bullet("**Schedule generation**: <500ms including DB writes", "bullets"),
      bullet("**Bundle size**: Critical path (login + dashboard) in main bundle; 13 routes lazy-loaded", "bullets"),

      h2("6.3 Accessibility (WCAG 2.1 AA Target)"),
      bullet("Skip-to-main-content link", "bullets"),
      bullet("ARIA labels on interactive elements", "bullets"),
      bullet("Focus traps in modal overlays", "bullets"),
      bullet("Keyboard navigation for all workflows", "bullets"),
      bullet("Color contrast ratios meeting AA standards", "bullets"),
      bullet("Screen reader compatible form labels and error messages", "bullets"),

      h2("6.4 Browser Support"),
      bullet("Chrome 90+ (primary)", "bullets"),
      bullet("Firefox 90+", "bullets"),
      bullet("Safari 15+", "bullets"),
      bullet("Edge 90+", "bullets"),
      bullet("Mobile: iOS Safari 15+, Chrome for Android", "bullets"),

      h2("6.5 Availability"),
      bullet("Target: 99.9% uptime (Cloudflare infrastructure)", "bullets"),
      bullet("Graceful degradation: email failures don't block registration", "bullets"),
      bullet("No single points of failure (Cloudflare global edge network)", "bullets"),

      // Section 7: Routes & Pages
      new Paragraph({ children: [new PageBreak()] }),
      h1("7. Routes & Pages"),
      makeTable(
        ["Route", "Page", "Auth Required", "Description"],
        [
          ["/login", "LoginPage", "No", "Google/Phone sign-in"],
          ["/register", "RegisterPage", "No", "Alternative registration flow"],
          ["/forgot-password", "ForgotPasswordPage", "No", "Password reset request"],
          ["/reset-password", "ResetPasswordPage", "No", "Password reset completion"],
          ["/pending", "PendingPage", "Yes", "Awaiting admin approval"],
          ["/dashboard", "DashboardPage", "Yes", "Main hub: templates + schedules"],
          ["/schedule/:id", "SchedulePage", "Yes", "Individual schedule view"],
          ["/customize", "CustomizePage", "Yes", "Settings hub"],
          ["/customize/templates", "TemplateEditorPage", "Yes", "Edit template properties"],
          ["/customize/print", "PrintSettingsPage", "Yes", "Print preferences"],
          ["/profile", "ProfilePage", "Yes", "User profile + clinic info"],
          ["/admin", "AdminPage", "Admin", "User management + audit log"],
          ["/privacy", "PrivacyPolicyPage", "No", "Privacy policy"],
          ["/terms", "TermsOfServicePage", "No", "Terms of service"],
          ["/security", "SecurityPage", "No", "Security overview"],
          ["/", "Redirect \u2192 /dashboard", "\u2014", "Root redirect"],
          ["*", "NotFoundPage", "No", "404 page"],
        ],
        [2200, 2500, 1600, 3060]
      ),

      // Section 8: API Endpoints
      h1("8. API Endpoints"),
      makeTable(
        ["Method", "Path", "Auth", "Description"],
        [
          ["GET", "/api/v1/health", "None", "Health check"],
          ["POST", "/api/v1/auth/firebase", "None", "Firebase token \u2192 PTOWL JWT"],
          ["POST", "/api/v1/auth/logout", "User", "Clear session cookies"],
          ["POST", "/api/v1/auth/refresh", "User", "Refresh JWT tokens"],
          ["GET", "/api/v1/auth/me", "User", "Get current user + profile"],
          ["GET", "/api/v1/schedules", "User", "List schedules (paginated)"],
          ["POST", "/api/v1/schedules", "User + CSRF", "Create schedule + appointments"],
          ["GET", "/api/v1/schedules/:id", "User", "Get schedule with appointments"],
          ["DELETE", "/api/v1/schedules/:id", "User + CSRF", "Delete schedule + appointments"],
          ["GET", "/api/v1/templates", "User", "List user's templates"],
          ["PUT", "/api/v1/templates/:id", "User + CSRF", "Update template properties"],
          ["PATCH", "/api/v1/appointments/:id", "User + CSRF", "Update appointment (time, provider, reminder)"],
          ["GET", "/api/v1/profile", "User", "Get clinic profile"],
          ["PUT", "/api/v1/profile", "User + CSRF", "Update clinic info"],
          ["POST", "/api/v1/profile/logo", "User + CSRF", "Upload clinic logo (base64)"],
          ["GET", "/api/v1/alias", "User", "Get sports alias for initials"],
          ["POST", "/api/v1/admin/login", "None", "Admin email/password login"],
          ["POST", "/api/v1/admin/send-code", "Admin", "Request 2FA email code"],
          ["POST", "/api/v1/admin/verify-code", "Admin", "Verify 2FA code"],
          ["GET", "/api/v1/admin/users", "Admin", "List all users"],
          ["POST", "/api/v1/admin/approve/:id", "Admin + CSRF", "Approve pending user"],
          ["POST", "/api/v1/admin/deny/:id", "Admin + CSRF", "Deny pending user"],
        ],
        [1200, 3200, 1800, 3160]
      ),

      new Paragraph({ spacing: { before: 400 }, children: [
        new TextRun({ text: "This document is maintained alongside the codebase and updated as product requirements evolve.", font: "Arial", size: 18, italics: true, color: "999999" })
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/nurel/OneDrive/Desktop/ptowl/docs/PRD.docx", buffer);
  console.log("PRD.docx created successfully");
});
