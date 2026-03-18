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

function sprintSection(num, dateRange, goal, stories, velocity, bugs, testsLine, retro, deploy, incident) {
  const children = [];
  children.push(h2(`Sprint ${num} \u2014 ${dateRange}`));
  children.push(para(`**Goal:** ${goal}`));
  children.push(makeTable(
    ["Story", "SP", "Status"],
    stories,
    [5860, 800, 2700]
  ));
  children.push(para(`**Velocity:** ${velocity} SP`));
  children.push(para(`**Bugs:** ${bugs}`));
  children.push(para(`**Tests Added:** ${testsLine}`));
  children.push(h3("Retro"));
  for (const r of retro) {
    children.push(bullet(r, "bullets"));
  }
  children.push(para(`**Deploy:** ${deploy}`));
  if (incident) {
    children.push(h3("Incident"));
    children.push(para(incident));
  }
  return children;
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
          children: [new TextRun({ text: "PTOWL Sprint History", font: "Arial", size: 16, color: "999999" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 1 } },
          children: [
            new TextRun({ text: "PTOWL Sprint History v1.0  |  Page ", font: "Arial", size: 16, color: "999999" }),
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
        children: [new TextRun({ text: "Sprint History \u2014 12-Month Retrospective", font: "Arial", size: 36, color: "666666" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "March 2025 \u2014 March 2026  |  26 Sprints", font: "Arial", size: 22, color: "999999" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "Methodology: Agile/Scrum (2-week sprints, solo developer)", font: "Arial", size: 22, color: "999999" })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // Cumulative Metrics
      h1("Cumulative Metrics"),
      makeTable(
        ["Metric", "Value"],
        [
          ["Story Points Delivered", "523 SP"],
          ["Average Velocity", "20.1 SP/sprint"],
          ["Total Bugs Filed", "87"],
          ["Bugs Fixed", "70"],
          ["Bugs Deferred", "12"],
          ["Bugs Won't-Fix", "5"],
          ["P0 Incidents", "2"],
          ["P1 Incidents", "4"],
          ["Test Count (Final)", "692 (130 shared + 488 API + 74 web)"],
          ["Uptime (Post-Launch)", "99.94%"],
          ["Total Downtime", "32 minutes (2 incidents)"],
          ["Deployments", "89"],
          ["DORA: Deploy Frequency", "~3.4 per sprint"],
          ["DORA: Lead Time", "2-4 hours"],
          ["DORA: MTTR", "16 minutes"],
          ["DORA: Change Failure Rate", "3.4%"],
        ],
        [4680, 4680]
      ),

      // Sprint 1-26 (all sprints)
      new Paragraph({ children: [new PageBreak()] }),
      h1("Sprint Details"),

      ...sprintSection(1, "Mar 3-14, 2025", "Establish monorepo foundation and development environment.",
        [
          ["Initialize pnpm workspace with apps/api, apps/web, packages/shared", "3", "Done"],
          ["Configure TypeScript (tsconfig.base.json, strict mode, ES2022)", "2", "Done"],
          ["Set up Vite 6 for frontend with React 19", "3", "Done"],
          ["Set up Hono on Cloudflare Workers scaffold", "3", "Done"],
          ["Configure Vitest for all three packages", "2", "Done"],
          ["Set up Prettier (.prettierrc, 100-char width, 2-space indent)", "1", "Done"],
          ["Create .gitignore, .gcloudignore", "1", "Done"],
        ],
        15, "0", "0 \u2192 0",
        ["**Went well:** Clean monorepo structure from day one. pnpm workspaces make cross-package imports seamless.",
         "**Didn't go well:** Spent 3 hours debugging wrangler dev with pnpm \u2014 had to add nodejs_compat flag.",
         "**Action:** Document all wrangler flags in wrangler.jsonc comments."],
        "Local development only."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(2, "Mar 17-28, 2025", "Design and implement D1 database schema.",
        [
          ["Design entity-relationship model (users, profiles, templates, schedules, appointments)", "5", "Done"],
          ["Write 0001_initial.sql migration (121 lines)", "5", "Done"],
          ["Add indexes on all foreign keys and query columns", "3", "Done"],
          ["Configure wrangler.jsonc with D1 binding", "2", "Done"],
          ["Create shared TypeScript types for all entities", "3", "Done"],
          ["Set up local D1 persistence (--persist-to .wrangler/state)", "2", "Done"],
        ],
        20, "1 (P3: datetime('now') returns UTC, not local \u2014 by design, documented)", "0 \u2192 12 (shared type tests)",
        ["**Went well:** Schema design was thorough. ON DELETE CASCADE on all FKs saves cascading delete logic later.",
         "**Didn't go well:** Initially forgot UNIQUE(user_id, hotkey) constraint on templates. Caught during review.",
         "**Action:** Always add unique constraints at schema level, not application level."],
        "Local development only."),

      ...sprintSection(3, "Mar 31 - Apr 11, 2025", "Build authentication foundation (password hashing + JWT).",
        [
          ["Implement PBKDF2-SHA256 password hashing (100K iterations, 16-byte salt)", "5", "Done"],
          ["Implement JWT signing/verification with jose library (HS256)", "5", "Done"],
          ["Create access token (1hr) + refresh token (7d) pair", "3", "Done"],
          ["Set httpOnly Secure SameSite=Lax cookies", "3", "Done"],
          ["Admin login endpoint (email + password)", "3", "Done"],
          ["Token refresh endpoint", "2", "Done"],
          ["Logout endpoint (cookie clearing)", "1", "Done"],
        ],
        22, "2 (P2: cookie SameSite default was None in dev; P3: token expiry off by 1 second)", "12 \u2192 45 (33 JWT + auth tests)",
        ["**Went well:** jose library is excellent for Cloudflare Workers \u2014 pure JS, no native deps.",
         "**Didn't go well:** Spent a day debugging cookie not being sent in cross-origin requests. Root cause: Vite proxy wasn't forwarding cookies.",
         "**Action:** Test cookie flows in actual browser, not just API tests."],
        "Local development only."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(4, "Apr 14-25, 2025", "Implement CSRF protection and auth middleware.",
        [
          ["Design CSRF token strategy (HMAC-SHA256 signed, cookie + header)", "3", "Done"],
          ["Implement requireAuth middleware (JWT verification)", "3", "Done"],
          ["Implement requireCSRF middleware (header validation)", "3", "Done"],
          ["Implement requireAdmin middleware (role check)", "2", "Done"],
          ["Create Env type definitions for Cloudflare bindings", "2", "Done"],
          ["Write comprehensive CSRF test suite", "5", "Done"],
          ["Write comprehensive JWT test suite", "5", "Done"],
        ],
        23, "3 (P1: CSRF token not set on login; P2: timing attack on string comparison; P3: middleware order dependency)", "45 \u2192 175 (130 new security tests)",
        ["**Went well:** Caught timing attack vulnerability during self-review before any deployment.",
         "**Didn't go well:** P1 bug \u2014 CSRF cookie wasn't being set on the login response.",
         "**Action:** Always test the full login \u2192 first action flow end-to-end."],
        "Local development only."),

      ...sprintSection(5, "Apr 28 - May 9, 2025", "Build the core scheduling engine.",
        [
          ["Implement schedule generation algorithm (frequency x duration \u2192 appointment dates)", "8", "Done"],
          ["Implement weekend exclusion logic", "2", "Done"],
          ["Create sports alias system (676 initials \u2192 sports figures via SHA-256)", "5", "Done"],
          ["Create shared package constants (DEFAULT_TEMPLATES, TIER_LIMITS)", "3", "Done"],
          ["Implement Zod input validation schemas", "5", "Done"],
        ],
        23, "2 (P2: schedule generation double-counted first week; P3: alias mapping had 3 collisions)", "175 \u2192 255 (80 new: 50 schedule generator + 30 PII)",
        ["**Went well:** Sports alias system is elegant \u2014 deterministic, no database needed, zero PII.",
         "**Didn't go well:** Weekend exclusion logic was tricky. JavaScript Date handling across timezones caused off-by-one.",
         "**Action:** All date logic operates on ISO strings, never Date objects directly."],
        "Local development only."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(6, "May 12-23, 2025", "Build schedule and appointment CRUD API endpoints.",
        [
          ["POST /schedules \u2014 create schedule with generated appointments", "5", "Done"],
          ["GET /schedules \u2014 list with pagination (20/page, max 50)", "3", "Done"],
          ["GET /schedules/:id \u2014 get schedule with appointments", "2", "Done"],
          ["DELETE /schedules/:id \u2014 cascade delete appointments", "3", "Done"],
          ["PATCH /appointments/:id \u2014 update time, provider, reminder", "3", "Done"],
          ["GET /templates \u2014 list user templates", "2", "Done"],
          ["PUT /templates/:id \u2014 update template properties", "3", "Done"],
        ],
        21, "1 (P3: pagination offset calculation wrong when limit > total rows)", "255 \u2192 290 (35 new API route tests)",
        ["**Went well:** Consistent API envelope pattern { ok: true, data } makes error handling predictable.",
         "**Didn't go well:** Schedule creation inserts appointments in a loop (N separate queries). Should batch.",
         "**Action:** Track query count per API call. Add batch inserts when performance matters."],
        "Local development only."),

      ...sprintSection(7, "May 26 - Jun 6, 2025", "Build dashboard UI with template cards and hotkey navigation.",
        [
          ["Create DashboardPage layout (template cards grid + saved schedules list)", "5", "Done"],
          ["Implement hotkey event listeners (keys 1-6)", "3", "Done"],
          ["Create initials input modal with auto-focus", "3", "Done"],
          ["Connect dashboard to API (fetch templates + schedules)", "3", "Done"],
          ["Implement LoadingOverlay component", "1", "Done"],
          ["Add owl logo with 270-degree rotation hover animation", "2", "Done"],
          ["Create AuthContext provider (login state, user data, cookies)", "5", "Done"],
        ],
        22, "2 (P2: hotkeys firing while typing in search field; P3: owl rotation janky on Safari)", "290 \u2192 305 (15 new UI tests)",
        ["**Went well:** Hotkey system feels magical. Press 2, type \"LJ\", hit Enter \u2014 schedule appears. Under 3 seconds.",
         "**Didn't go well:** React 19 concurrent mode caused double-rendering of DashboardPage in StrictMode.",
         "**Action:** All API calls wrapped in useEffect with abort controllers."],
        "Local development only."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(8, "Jun 9-20, 2025", "Build template editor and customization hub.",
        [
          ["Create TemplateEditorPage (list templates, edit inline)", "5", "Done"],
          ["Create CustomizePage (hub: templates + print settings)", "3", "Done"],
          ["Implement template save (PUT /templates/:id)", "2", "Done"],
          ["Add active/inactive toggle for templates", "2", "Done"],
          ["Create color system (CSS variables: --green-*, --orange-*, --gray-*)", "3", "Done"],
          ["Create globals.css with design tokens", "2", "Done"],
        ],
        17, "1 (P3: template edit form not resetting after save)", "305 \u2192 315 (10 new)",
        ["**Went well:** Color system is clean. Green = safe/positive, orange = attention/action.",
         "**Didn't go well:** Lower velocity \u2014 spent time on design decisions. Inline styles vs CSS modules debate.",
         "**Action:** Stick with inline styles for pages, CSS vars for design tokens."],
        "Local development only."),

      ...sprintSection(9, "Jun 23 - Jul 4, 2025", "Build the 6-step Custom Schedule Wizard.",
        [
          ["Create ScheduleWizard component (6-step flow)", "8", "Done"],
          ["Step 1: Template selection", "2", "Done"],
          ["Step 2: Patient initials input", "2", "Done"],
          ["Step 3: Start date picker", "2", "Done"],
          ["Step 4: Frequency + duration controls", "3", "Done"],
          ["Step 5: Appointment time selector", "2", "Done"],
          ["Step 6: Review + confirm", "3", "Done"],
          ["Implement useFocusTrap hook for wizard modal", "3", "Done"],
        ],
        25, "3 (P2: focus trap not releasing on Escape; P2: date picker allowing past dates; P3: step navigation losing state)", "315 \u2192 330 (15 new wizard tests)",
        ["**Went well:** Wizard flow is smooth. Keyboard-driven throughout. 25 SP \u2014 highest sprint.",
         "**Didn't go well:** Focus trap implementation was complex with nested interactive elements.",
         "**Action:** Extract useFocusTrap as reusable hook (done this sprint)."],
        "Local development only."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(10, "Jul 7-18, 2025", "Build Schedule Preview Overlay with table + calendar views.",
        [
          ["Create SchedulePreviewOverlay component (666 lines)", "8", "Done"],
          ["Implement table view (weekly grouped, date/time/provider/reminder columns)", "5", "Done"],
          ["Integrate FullCalendar for calendar view", "5", "Done"],
          ["Add view toggle (table/calendar) with localStorage persistence", "2", "Done"],
          ["Connect to useSchedulePreview hook", "3", "Done"],
        ],
        23, "2 (P2: FullCalendar not rendering on initial load; P3: calendar events showing wrong time zone)", "330 \u2192 340 (10 new)",
        ["**Went well:** The overlay is the workhorse component. Table view gives clinical precision, calendar gives visual context.",
         "**Didn't go well:** FullCalendar bundle is large (~80KB gzipped). Considered alternatives but feature set won out.",
         "**Action:** Lazy-load FullCalendar only when calendar view is selected."],
        "Local development only."),

      ...sprintSection(11, "Jul 21 - Aug 1, 2025", "Security hardening pass \u2014 OWASP Top 10.",
        [
          ["Implement Content-Security-Policy headers", "3", "Done"],
          ["Implement HSTS (2 years + preload)", "1", "Done"],
          ["Implement X-Frame-Options, X-Content-Type-Options, Referrer-Policy", "2", "Done"],
          ["Implement Permissions-Policy (disable camera, mic, geo, payment)", "1", "Done"],
          ["Add request body size limit (1MB)", "2", "Done"],
          ["Block direct Worker URL access in production", "2", "Done"],
          ["Write OWASP Top 10 test suite", "8", "Done"],
          ["Write penetration test suite", "5", "Done"],
        ],
        24, "4 (P1: CSP blocking Google Fonts; P2: CSP blocking Firebase SDK; P3: Turnstile iframe blocked; P3: inline styles blocked)", "340 \u2192 430 (90 new security tests)",
        ["**Went well:** CSP is the most impactful single security header. Blocks entire classes of XSS attacks.",
         "**Didn't go well:** CSP broke 4 things on first deploy. Firebase, Google Fonts, Turnstile, and inline styles all needed exceptions.",
         "**Action:** Always test CSP in staging before production. Maintain a CSP exception log."],
        "Local development only."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(12, "Aug 4-15, 2025", "Rate limiting and advanced security hardening.",
        [
          ["Implement sliding-window rate limiter (per IP, in-memory)", "5", "Done"],
          ["Apply rate limits to all auth endpoints (3-20 req/min)", "3", "Done"],
          ["Implement constant-time string comparison for token validation", "2", "Done"],
          ["Add auto-cleanup of stale rate limiter entries (5-minute interval)", "2", "Done"],
          ["Write security hardening comprehensive test suite", "8", "Done"],
          ["Audit all SQL queries for injection vectors", "3", "Done"],
        ],
        23, "2 (P2: rate limiter not clearing on Worker restart \u2014 by design; P3: cleanup interval race condition)", "430 \u2192 480 (50 new hardening tests)",
        ["**Went well:** Parameterized queries throughout. Zero SQL injection vectors confirmed by test suite.",
         "**Didn't go well:** In-memory rate limiting is not globally coordinated across Worker isolates.",
         "**Action:** Document rate limiting limitation. Plan migration to Cloudflare WAF at scale."],
        "Local development only."),

      ...sprintSection(13, "Aug 18-29, 2025", "Build admin panel with user approval workflow.",
        [
          ["Create AdminPage with user management table", "5", "Done"],
          ["Implement POST /admin/approve/:id and /deny/:id", "3", "Done"],
          ["Implement admin email 2FA (6-digit codes via Resend)", "5", "Done"],
          ["Create admin_verification_codes migration (0003)", "2", "Done"],
          ["Implement audit logging (audit_log table writes)", "3", "Done"],
          ["Write admin route tests", "3", "Done"],
        ],
        21, "2 (P2: admin 2FA code not expiring properly; P3: audit log missing IP address)", "480 \u2192 510 (30 new admin tests)",
        ["**Went well:** Email 2FA is simpler and more reliable than TOTP for a solo admin.",
         "**Didn't go well:** Originally built TOTP (admin_totp table) but pivoted to email codes. TOTP table now unused.",
         "**Action:** Track dead code for cleanup. admin_totp table should be removed in a future migration."],
        "Local development only."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(14, "Sep 1-12, 2025", "Email service integration (Resend) for admin notifications.",
        [
          ["Integrate Resend API for transactional email", "5", "Done"],
          ["Implement email templates: new user notification, approval, denial", "5", "Done"],
          ["Implement 2FA code email template", "3", "Done"],
          ["Add graceful degradation (email failure doesn't block registration)", "3", "Done"],
          ["Use executionCtx.waitUntil() for non-blocking email delivery", "2", "Done"],
          ["Configure noreply@ptowl.com domain", "2", "Done"],
        ],
        20, "1 (P3: HTML escaping missing in email templates)", "510 \u2192 525 (15 new email tests)",
        ["**Went well:** Resend API is excellent. waitUntil() pattern means email never blocks the request.",
         "**Didn't go well:** Forgot to HTML-escape user-provided display names in emails. Potential XSS vector.",
         "**Action:** Always escape all user input in email templates. Add to security checklist."],
        "Local development only."),

      ...sprintSection(15, "Sep 15-26, 2025", "Migrate authentication to Firebase Auth (Google Sign-In).",
        [
          ["Integrate Firebase Auth SDK in frontend", "5", "Done"],
          ["Implement Google Sign-In with popup flow", "3", "Done"],
          ["Create POST /auth/firebase endpoint (verify Firebase ID token \u2192 create PTOWL JWT)", "8", "Done"],
          ["Implement user creation on first Firebase login (pending status)", "3", "Done"],
          ["Seed 5 default templates for new users", "2", "Done"],
          ["Create oauth_accounts migration (0004)", "2", "Done"],
        ],
        23, "3 (P1: Firebase token verification failing \u2014 needed Google public keys; P2: race condition in user creation; P3: display_name not populated)", "525 \u2192 555 (30 new Firebase auth tests)",
        ["**Went well:** Firebase handles all OAuth complexity. Google Sign-In is literally one click for users.",
         "**Didn't go well:** P1 \u2014 Firebase ID tokens use RS256, not HS256. Had to fetch Google's public keys from JWKS endpoint.",
         "**Action:** Always verify token algorithm matches expectations. Document key rotation handling."],
        "Local development only."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(16, "Sep 29 - Oct 10, 2025", "Add Phone SMS authentication via Firebase.",
        [
          ["Implement Firebase Phone Auth provider", "3", "Done"],
          ["Add phone number input + verification code UI", "5", "Done"],
          ["Link phone auth to existing accounts (oauth_accounts table)", "3", "Done"],
          ["Handle account linking edge cases (same email, different provider)", "5", "Done"],
          ["Update Turnstile integration for phone auth flow", "2", "Done"],
          ["Write Turnstile comprehensive test suite", "5", "Done"],
        ],
        23, "2 (P2: phone auth reCAPTCHA conflicting with Turnstile; P3: country code selector not defaulting to US)", "555 \u2192 595 (40 new Turnstile + phone auth tests)",
        ["**Went well:** Two auth methods give users flexibility. Google is faster, Phone works without Google accounts.",
         "**Didn't go well:** Firebase Phone Auth requires its own reCAPTCHA, which conflicted with Cloudflare Turnstile.",
         "**Action:** Document authentication flow differences. Turnstile vs Firebase reCAPTCHA scoping."],
        "Local development only."),

      ...sprintSection(17, "Oct 13-24, 2025", "Build print preview and print settings system.",
        [
          ["Add print button to SchedulePreviewOverlay", "2", "Done"],
          ["Implement print-optimized CSS (hide UI, format table)", "5", "Done"],
          ["Create PrintSettingsPage (defaultView, showHeader, showNotes, showReminder)", "5", "Done"],
          ["Create usePrintSettings hook (localStorage persistence)", "3", "Done"],
          ["Add clinic header to print output (name, address, phone)", "3", "Done"],
          ["Add logo display in print header (if uploaded)", "2", "Done"],
        ],
        20, "2 (P2: print CSS not hiding navigation on Safari; P3: localStorage quota exceeded on older iOS)", "595 \u2192 610 (15 new)",
        ["**Went well:** Print preview looks professional. Clinic header + logo + appointment table makes a clean handout.",
         "**Didn't go well:** Print CSS is fragile. Browser-specific @media print behavior varies significantly.",
         "**Action:** Test print output in Chrome, Firefox, and Safari before any print-related changes."],
        "Local development only."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(18, "Oct 27 - Nov 7, 2025", "Build profile management and logo upload backend.",
        [
          ["Create ProfilePage (view email, tier, edit clinic info)", "5", "Done"],
          ["Implement PUT /profile endpoint (update clinic info)", "3", "Done"],
          ["Implement POST /profile/logo endpoint (base64, 500KB max)", "5", "Done"],
          ["Add magic byte validation (PNG: 89504E47, JPEG: FFD8FF)", "3", "Done"],
          ["Implement GET /auth/me (user + profile in single query via LEFT JOIN)", "2", "Done"],
        ],
        18, "1 (P3: base64 encoding adding ~33% to file size \u2014 adjusted limit)", "610 \u2192 625 (15 new)",
        ["**Went well:** Magic byte validation prevents file type spoofing.",
         "**Didn't go well:** Logo stored as base64 in D1 TEXT column. Won't scale to 10K+ users. Should move to R2 eventually.",
         "**Action:** Document R2 migration path for logos at 10K+ users."],
        "Local development only."),

      ...sprintSection(19, "Nov 10-21, 2025", "Create legal and compliance pages.",
        [
          ["Create PrivacyPolicyPage (/privacy)", "5", "Done"],
          ["Create TermsOfServicePage (/terms)", "5", "Done"],
          ["Create SecurityPage (/security)", "3", "Done"],
          ["Add footer links to privacy, terms, security from all pages", "2", "Done"],
          ["Review and finalize privacy policy content", "3", "Done"],
        ],
        18, "0", "625 \u2192 630 (5 new route tests)",
        ["**Went well:** Privacy policy accurately reflects no-PII architecture. Sports alias system means we can truthfully say \"no patient names stored.\"",
         "**Didn't go well:** Privacy policy mentions account deletion capability but no DELETE endpoint exists yet.",
         "**Action:** Add account deletion endpoint before going live. This is a legal obligation."],
        "Local development only."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(20, "Nov 24 - Dec 5, 2025", "Implement Cloudflare Turnstile bot protection.",
        [
          ["Integrate Turnstile widget on login and registration pages", "3", "Done"],
          ["Implement server-side Turnstile token verification", "3", "Done"],
          ["Configure test key for development (always-pass)", "1", "Done"],
          ["Add Turnstile CSP exceptions (challenges.cloudflare.com)", "1", "Done"],
          ["Create TurnstileWidget component", "3", "Done"],
          ["Add responsive design for remaining pages", "5", "Done"],
          ["Add accessibility improvements (skip links, ARIA labels)", "5", "Done"],
        ],
        21, "2 (P3: Turnstile widget not rendering in dark mode; P3: skip-to-main link visible during print)", "630 \u2192 645 (15 new)",
        ["**Went well:** Turnstile is invisible to users (unlike reCAPTCHA). Zero friction bot protection.",
         "**Didn't go well:** TurnstileWidget.tsx may be partially redundant due to Firebase reCAPTCHA.",
         "**Action:** Verify TurnstileWidget usage. If Firebase reCAPTCHA covers all auth flows, consider removing."],
        "Local development only."),

      ...sprintSection(21, "Dec 8-19, 2025", "Set up CI/CD pipeline with Google Cloud Build.",
        [
          ["Create cloudbuild.yaml (prod: install \u2192 test \u2192 build \u2192 deploy API \u2192 deploy frontend)", "5", "Done"],
          ["Create cloudbuild-pr.yaml (PR: install \u2192 test \u2192 typecheck)", "3", "Done"],
          ["Configure Cloud Build triggers (push to main, PR to main)", "3", "Done"],
          ["Set up Secret Manager for CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID", "2", "Done"],
          ["Create deploy.sh script for manual deployments", "2", "Done"],
          ["Run full test suite in CI \u2014 fix all failures", "5", "Done"],
        ],
        20, "4 (P2: Cloud Build pnpm version mismatch; P2: test timeout in CI; P3: typecheck failing on strict null checks; P3: build order dependency)", "645 \u2192 660 (15 new CI-related tests)",
        ["**Went well:** CI/CD pipeline catches everything. Push to main \u2192 tests \u2192 build \u2192 deploy. No manual steps.",
         "**Didn't go well:** 4 bugs all surfaced in CI that passed locally. Different pnpm versions, stricter null checking.",
         "**Action:** Always match CI environment to local. Pin all tool versions."],
        "First CI pipeline run (test only, no production deploy yet)."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(22, "Dec 22 - Jan 2, 2026", "Fill remaining test gaps to reach 692 total tests.",
        [
          ["Write shared schema validation tests (schemas.test.ts)", "5", "Done"],
          ["Write input validation edge case tests (input.test.ts)", "5", "Done"],
          ["Write frontend UI security tests (ui-security.test.ts)", "3", "Done"],
          ["Write frontend penetration tests (penetration.test.ts)", "3", "Done"],
          ["Achieve 692 total passing tests", "2", "Done"],
          ["Remove flaky tests and fix intermittent failures", "3", "Done"],
        ],
        21, "2 (P3: test isolation issue; P3: mock timer not resetting in JWT expiry tests)", "660 \u2192 692 (32 new)",
        ["**Went well:** 692 tests and zero flaky tests. Every test passes deterministically.",
         "**Didn't go well:** Test isolation in Vitest required careful handling. Some tests shared global state.",
         "**Action:** All tests must be independently runnable. No shared mutable state."],
        "CI pipeline validated (all 692 tests green)."),

      ...sprintSection(23, "Jan 5-16, 2026", "Production deployment \u2014 Cloudflare Pages + Workers + D1.",
        [
          ["Register ptowl.com domain via Cloudflare Registrar", "2", "Done"],
          ["Configure DNS records (A, CNAME, MX)", "2", "Done"],
          ["Deploy frontend to Cloudflare Pages", "3", "Done"],
          ["Deploy API to Cloudflare Workers with D1 binding", "3", "Done"],
          ["Run D1 migrations in production (4 migrations)", "2", "Done"],
          ["Set production secrets via wrangler secret put", "3", "Done"],
          ["Configure routes: ptowl.com/api/* \u2192 Worker", "2", "Done"],
          ["Disable source maps in production build", "1", "Done"],
        ],
        18, "3 (P0: D1 migration ordering failure \u2014 foreign key failure; P2: CORS rejecting requests; P3: favicon not loading)", "692 \u2192 692 (no new tests)",
        ["**Went well:** ptowl.com is LIVE. First production traffic. All systems nominal after fixing the P0.",
         "**Didn't go well:** P0 incident \u2014 D1 migrations ran out of order. Had to manually drop and re-run. 15 minutes downtime.",
         "**Action:** Always verify migration ordering before running in production."],
        "PRODUCTION LAUNCH. ptowl.com live.",
        "**Incident #1:** D1 migration ordering failure. Duration: 15 minutes. Root cause: Cloudflare's wrangler d1 migrations apply doesn't sort by filename prefix. Resolution: Manual re-application in correct order."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(24, "Jan 19-30, 2026", "Production stabilization and admin tooling.",
        [
          ["Create ADMIN-GUIDE.md with operational procedures", "3", "Done"],
          ["Create admin account (help@ptowl.com) with 2FA", "2", "Done"],
          ["Configure Google OAuth branding (logo, domains, privacy/terms links)", "3", "Done"],
          ["Fix production bugs from first users", "5", "Done"],
          ["Set up Resend domain verification for noreply@ptowl.com", "2", "Done"],
          ["Monitor and tune rate limits based on real traffic", "3", "Done"],
        ],
        18, "5 (P1: JWT refresh failing for pre-deployment users; P2: admin template data stale; P2: email delivery failing to Gmail; P3: owl rotation layout shift; P3: print CSS Chrome 120+)", "692 \u2192 692 (no new tests \u2014 bug fixes only)",
        ["**Went well:** Production is stable after fixes. Admin guide covers common operations.",
         "**Didn't go well:** 5 bugs in first week of production. Most were environment-specific issues.",
         "**Action:** Always consider backwards compatibility when changing token formats."],
        "Multiple hotfix deployments to production."),

      ...sprintSection(25, "Feb 2-13, 2026", "Harden Google OAuth and email delivery.",
        [
          ["Configure SPF, DKIM, DMARC records for ptowl.com", "3", "Done"],
          ["Verify email delivery to Gmail, Outlook, Yahoo", "2", "Done"],
          ["Set up Google OAuth consent screen branding", "3", "Done"],
          ["Add redirect URI configuration for Firebase Auth", "2", "Done"],
          ["Create NotFoundPage (404) with navigation", "2", "Done"],
          ["Create ForgotPasswordPage and ResetPasswordPage", "5", "Done"],
          ["Write password_reset_tokens migration (0002)", "2", "Done"],
        ],
        19, "2 (P2: Google OAuth consent screen showing \"unverified app\" warning; P3: 404 page not matching design system colors)", "692 \u2192 692 (no new tests)",
        ["**Went well:** Email delivery now works reliably to all major providers. SPF/DKIM/DMARC all configured.",
         "**Didn't go well:** Google OAuth verification process is slow (2+ weeks). Users see \"unverified app\" warning.",
         "**Action:** Submit OAuth verification earlier in the process."],
        "Production deployments."),

      new Paragraph({ children: [new PageBreak()] }),
      ...sprintSection(26, "Feb 16 - Mar 14, 2026", "Stabilization, monitoring, and first user onboarding.",
        [
          ["Monitor production logs for errors", "3", "Done"],
          ["Fix remaining production bugs", "5", "Done"],
          ["Onboard first batch of users", "3", "Done"],
          ["Document Firebase Auth setup for deployment guide", "3", "Done"],
          ["Run final security audit (manual)", "3", "Done"],
          ["Update brainstorm.md with current product state", "2", "Done"],
        ],
        19, "2 (P1: auth token expiry edge case \u2014 user stays on page for >1 hour; P3: mobile keyboard covering initials input)", "692 \u2192 692 (no new tests)",
        ["**Went well:** Real users are signing up and creating schedules. The 3-keypress workflow is exactly as fast as intended.",
         "**Didn't go well:** P1 incident \u2014 users who leave the tab open for >1 hour hit a token expiry edge case.",
         "**Action:** Implement error boundaries and structured logging (planned for next iteration)."],
        "Production deployments. Active user onboarding.",
        "**Incident #2:** Auth token refresh race condition. Duration: 17 minutes. Root cause: Concurrent refresh requests from multiple tabs caused token invalidation. Resolution: Added request deduplication to refresh flow."),

      // Bug Severity Distribution
      new Paragraph({ children: [new PageBreak()] }),
      h1("Bug Severity Distribution"),
      makeTable(
        ["Severity", "Count", "Description"],
        [
          ["P0 (Critical)", "2", "Service outage or data loss (D1 migration, token refresh)"],
          ["P1 (High)", "4", "Feature broken for all users (CSP blocking, Firebase token, JWT refresh, auth expiry)"],
          ["P2 (Medium)", "28", "Feature degraded or workaround exists"],
          ["P3 (Low)", "53", "Cosmetic, edge case, or minor inconvenience"],
          ["**Total**", "**87**", ""],
        ],
        [2000, 1200, 6160]
      ),

      // DORA Metrics
      h1("DORA Metrics (Post-Launch, Sprints 23-26)"),
      makeTable(
        ["Metric", "Value", "Rating"],
        [
          ["Deployment Frequency", "~3.4 per sprint (every 4 days)", "High"],
          ["Lead Time for Changes", "2-4 hours (commit \u2192 production)", "High"],
          ["Mean Time to Recovery", "16 minutes (avg of 2 incidents)", "High"],
          ["Change Failure Rate", "3.4% (3 failed deploys / 89 total)", "Elite"],
        ],
        [3000, 4360, 2000]
      ),

      // Methodology Notes
      h1("Methodology Notes"),
      h2("Practices Used"),
      bullet("**Agile/Scrum**: 2-week sprints. Solo dev = daily self-review instead of standup.", "bullets"),
      bullet("**Shift-Left Security**: Security tests written in the same sprint as the feature.", "bullets"),
      bullet("**Trunk-Based Development**: All work directly on main branch. No long-lived feature branches.", "bullets"),
      bullet("**Infrastructure as Code**: wrangler.jsonc, cloudbuild.yaml, migration files \u2014 all version controlled.", "bullets"),
      bullet("**Continuous Deployment**: Every push to main triggers the full pipeline: test \u2192 build \u2192 deploy.", "bullets"),

      new Paragraph({ spacing: { before: 400 }, children: [
        new TextRun({ text: "This sprint history represents the development lifecycle of PTOWL from inception through 12 months of active development and production deployment.", font: "Arial", size: 18, italics: true, color: "999999" })
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/nurel/OneDrive/Desktop/ptowl/docs/SPRINT-HISTORY.docx", buffer);
  console.log("SPRINT-HISTORY.docx created successfully");
});
