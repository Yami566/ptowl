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
function codeLine(text) {
  return new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text, font: "Consolas", size: 18, color: "333333" })]
  });
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
      { reference: "numbers2", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "numbers3", levels: [
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
          children: [new TextRun({ text: "PTOWL Technical Design Document", font: "Arial", size: 16, color: "999999" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 1 } },
          children: [
            new TextRun({ text: "PTOWL TDD v1.0  |  Page ", font: "Arial", size: 16, color: "999999" }),
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
        children: [new TextRun({ text: "Technical Design Document", font: "Arial", size: 36, color: "666666" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "Version 1.0  |  March 16, 2026", font: "Arial", size: 22, color: "999999" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "Status: Approved", font: "Arial", size: 22, color: "2D6A4F", bold: true })] }),
      new Paragraph({ children: [new PageBreak()] }),

      // Section 1
      h1("1. Architecture Overview"),
      h2("System Architecture"),
      para("PTOWL uses a Cloudflare-based architecture with React 19 frontend on Cloudflare Pages, Hono API on Cloudflare Workers, D1 SQLite database, Firebase Auth for user authentication, Resend for transactional email, and Cloudflare Turnstile for bot protection."),

      h2("Technology Stack"),
      makeTable(
        ["Layer", "Technology", "Version", "Purpose"],
        [
          ["Frontend", "React", "19.0.0", "UI framework"],
          ["Frontend", "TypeScript", "5.7.0", "Type safety"],
          ["Frontend", "Vite", "6.0.0", "Build tooling"],
          ["Frontend", "React Router", "7.1.0", "Client-side routing"],
          ["Frontend", "FullCalendar", "6.1.20", "Calendar view"],
          ["Frontend", "Firebase SDK", "12.10.0", "Auth client"],
          ["API", "Hono", "4.6.0", "HTTP framework"],
          ["API", "jose", "6.2.1", "JWT signing/verification"],
          ["API", "TypeScript", "5.7.0", "Type safety"],
          ["Validation", "Zod", "4.3.6", "Schema validation"],
          ["Testing", "Vitest", "2.1.0", "Test runner"],
          ["Hosting", "Cloudflare Pages", "\u2014", "Frontend hosting"],
          ["Runtime", "Cloudflare Workers", "\u2014", "API runtime"],
          ["Database", "Cloudflare D1", "\u2014", "SQLite database"],
          ["Email", "Resend API", "\u2014", "Transactional email"],
          ["Auth", "Firebase Auth", "\u2014", "User authentication"],
          ["Bot Protection", "Cloudflare Turnstile", "\u2014", "CAPTCHA alternative"],
        ],
        [1800, 2500, 1400, 3660]
      ),

      h2("Monorepo Structure"),
      para("The project uses a pnpm workspace monorepo with three packages: apps/api (Hono on Cloudflare Workers), apps/web (React frontend on Cloudflare Pages), and packages/shared (shared types, validators, and constants)."),
      bullet("**apps/api/src/**: crypto, middleware, migrations (4 files), routes (8 files), services, types, index.ts", "bullets"),
      bullet("**apps/web/src/**: components, contexts, hooks, pages (16 files), App.tsx, main.tsx", "bullets"),
      bullet("**packages/shared/src/**: constants, types, validators", "bullets"),
      bullet("**Root configs**: pnpm-workspace.yaml, tsconfig.base.json, cloudbuild.yaml, cloudbuild-pr.yaml", "bullets"),

      // Section 2
      new Paragraph({ children: [new PageBreak()] }),
      h1("2. Data Model"),
      h2("Entity Relationship"),
      para("users (1:1) profiles, users (1:N) templates, users (1:N) schedules (1:N) appointments, users (1:N) oauth_accounts, users (1:N) audit_log. Two unused tables: admin_totp, sessions."),

      h2("Table Definitions"),

      h3("users"),
      makeTable(
        ["Column", "Type", "Constraints", "Description"],
        [
          ["id", "TEXT", "PK, default hex(randomblob(16))", "32-char hex ID"],
          ["email", "TEXT", "NOT NULL, UNIQUE", "User email"],
          ["password_hash", "TEXT", "NOT NULL", "PBKDF2-SHA256 hash (admin only)"],
          ["display_name", "TEXT", "NOT NULL, default ''", "Display name"],
          ["status", "TEXT", "CHECK IN (pending, approved, denied, suspended)", "Account status"],
          ["role", "TEXT", "CHECK IN (user, admin)", "Authorization role"],
          ["tier", "TEXT", "CHECK IN (free, paid)", "Subscription tier"],
          ["created_at", "TEXT", "NOT NULL, default datetime('now')", "ISO timestamp"],
          ["updated_at", "TEXT", "NOT NULL, default datetime('now')", "ISO timestamp"],
        ],
        [1600, 1000, 3800, 2960]
      ),
      para("**Indexes:** idx_users_email(email), idx_users_status(status)"),

      h3("profiles"),
      makeTable(
        ["Column", "Type", "Constraints", "Description"],
        [
          ["id", "TEXT", "PK", "32-char hex ID"],
          ["user_id", "TEXT", "NOT NULL, UNIQUE, FK \u2192 users ON DELETE CASCADE", "Owner"],
          ["clinic_name", "TEXT", "NOT NULL, default ''", "Clinic name"],
          ["clinic_address", "TEXT", "NOT NULL, default ''", "Address"],
          ["clinic_phone", "TEXT", "NOT NULL, default ''", "Phone"],
          ["clinic_email", "TEXT", "NOT NULL, default ''", "Email"],
          ["logo_url", "TEXT", "DEFAULT NULL", "Base64 logo data URL"],
          ["created_at", "TEXT", "", "ISO timestamp"],
          ["updated_at", "TEXT", "", "ISO timestamp"],
        ],
        [1600, 1000, 3800, 2960]
      ),

      h3("templates"),
      makeTable(
        ["Column", "Type", "Constraints", "Description"],
        [
          ["id", "TEXT", "PK", "32-char hex ID"],
          ["user_id", "TEXT", "NOT NULL, FK \u2192 users ON DELETE CASCADE", "Owner"],
          ["hotkey", "INTEGER", "NOT NULL, CHECK 1-9, UNIQUE(user_id, hotkey)", "Keyboard shortcut"],
          ["name", "TEXT", "NOT NULL", "Template name"],
          ["sessions_per_week", "INTEGER", "NOT NULL, default 2", "Weekly frequency"],
          ["duration_weeks", "INTEGER", "NOT NULL, default 2", "Total weeks"],
          ["default_time", "TEXT", "DEFAULT '09:00'", "Default appointment time"],
          ["is_active", "INTEGER", "NOT NULL, default 1", "Active toggle"],
          ["sort_order", "INTEGER", "NOT NULL, default 0", "Display order"],
          ["created_at", "TEXT", "", "ISO timestamp"],
          ["updated_at", "TEXT", "", "ISO timestamp"],
        ],
        [1800, 1200, 3400, 2960]
      ),

      h3("schedules"),
      makeTable(
        ["Column", "Type", "Constraints", "Description"],
        [
          ["id", "TEXT", "PK", "32-char hex ID"],
          ["user_id", "TEXT", "NOT NULL, FK \u2192 users ON DELETE CASCADE", "Owner"],
          ["template_id", "TEXT", "FK \u2192 templates ON DELETE SET NULL", "Source template"],
          ["patient_initials", "TEXT", "NOT NULL, default ''", "2-letter initials"],
          ["patient_alias", "TEXT", "NOT NULL, default ''", "Sports figure name"],
          ["start_date", "TEXT", "NOT NULL", "ISO date"],
          ["end_date", "TEXT", "NOT NULL", "ISO date"],
          ["sessions_per_week", "INTEGER", "NOT NULL", "Frequency snapshot"],
          ["duration_weeks", "INTEGER", "NOT NULL", "Duration snapshot"],
          ["provider_name", "TEXT", "NOT NULL, default ''", "PT name"],
          ["notes", "TEXT", "DEFAULT ''", "Schedule notes"],
          ["view_preference", "TEXT", "CHECK IN (table, calendar)", "Default view"],
          ["created_at", "TEXT", "", "ISO timestamp"],
          ["updated_at", "TEXT", "", "ISO timestamp"],
        ],
        [1800, 1200, 3400, 2960]
      ),

      h3("appointments"),
      makeTable(
        ["Column", "Type", "Constraints", "Description"],
        [
          ["id", "TEXT", "PK", "32-char hex ID"],
          ["schedule_id", "TEXT", "NOT NULL, FK \u2192 schedules ON DELETE CASCADE", "Parent schedule"],
          ["appointment_date", "TEXT", "NOT NULL", "ISO date"],
          ["appointment_time", "TEXT", "NOT NULL, default '09:00'", "Time (HH:MM)"],
          ["provider_name", "TEXT", "DEFAULT ''", "PT name override"],
          ["reminder_sent", "INTEGER", "NOT NULL, default 0", "Reminder flag"],
          ["sort_order", "INTEGER", "NOT NULL, default 0", "Display order"],
          ["created_at", "TEXT", "", "ISO timestamp"],
          ["updated_at", "TEXT", "", "ISO timestamp"],
        ],
        [1800, 1200, 3400, 2960]
      ),

      h3("oauth_accounts"),
      makeTable(
        ["Column", "Type", "Constraints", "Description"],
        [
          ["id", "TEXT", "PK", "32-char hex ID"],
          ["user_id", "TEXT", "NOT NULL, FK \u2192 users ON DELETE CASCADE", "Owner"],
          ["provider", "TEXT", "NOT NULL", "'google', 'phone', 'apple'"],
          ["provider_account_id", "TEXT", "NOT NULL", "Provider's user ID"],
          ["created_at", "TEXT", "", "ISO timestamp"],
        ],
        [2000, 1200, 3200, 2960]
      ),

      h3("audit_log"),
      makeTable(
        ["Column", "Type", "Constraints", "Description"],
        [
          ["id", "TEXT", "PK", "32-char hex ID"],
          ["user_id", "TEXT", "nullable", "Actor user ID"],
          ["action", "TEXT", "NOT NULL", "Action identifier"],
          ["detail", "TEXT", "DEFAULT ''", "JSON detail string"],
          ["ip_address", "TEXT", "DEFAULT ''", "Client IP"],
          ["created_at", "TEXT", "", "ISO timestamp"],
        ],
        [2000, 1200, 3200, 2960]
      ),
      para("**Tracked Actions:** admin_login_failed, admin_code_sent, admin_code_failed, admin_verified, approve_user, deny_user, register_firebase, login_firebase"),

      h2("Migration History"),
      makeTable(
        ["Migration", "File", "Description"],
        [
          ["0001", "0001_initial.sql", "Core schema: users, profiles, templates, schedules, appointments, admin_totp, sessions, audit_log"],
          ["0002", "0002_password_reset_tokens.sql", "Password reset tokens table"],
          ["0003", "0003_admin_verification_codes.sql", "Admin email 2FA codes table"],
          ["0004", "0004_oauth_accounts.sql", "OAuth account linking table"],
        ],
        [1200, 3400, 4760]
      ),

      // Section 3
      new Paragraph({ children: [new PageBreak()] }),
      h1("3. API Contract"),
      h2("Authentication Flow"),
      para("The authentication flow uses Firebase Auth for identity, with PTOWL issuing its own JWT sessions stored in httpOnly cookies. The flow: Client calls signInWithPopup() \u2192 receives Firebase ID Token \u2192 sends POST /api/v1/auth/firebase \u2192 API verifies token against Firebase public keys \u2192 upserts user in D1 \u2192 sets httpOnly cookies (access_token, refresh_token, csrf_token)."),

      h2("CSRF Flow"),
      numbered("Login response sets csrf_token cookie (readable by JavaScript)", "numbers1"),
      numbered("Client reads csrf_token from document.cookie", "numbers1"),
      numbered("Client sends X-CSRF-Token header on every state-mutating request", "numbers1"),
      numbered("Server middleware validates: header value matches cookie value", "numbers1"),
      numbered("Both are HMAC-SHA256 signed with JWT_SECRET", "numbers1"),

      h2("Request/Response Format"),
      para("All API responses follow this envelope:"),
      para("**Success:** { ok: true, data: T }"),
      para("**Error:** { ok: false, error: { code: string, message: string } }"),

      h2("Rate Limiting"),
      makeTable(
        ["Endpoint", "Window", "Max Requests", "Key"],
        [
          ["/auth/refresh", "60s", "20", "IP:refresh"],
          ["/auth/firebase", "60s", "10", "IP:firebase"],
          ["/admin/login", "60s", "5", "IP:admin-login"],
          ["/admin/send-code", "60s", "3", "IP:admin-code"],
          ["/admin/verify-code", "60s", "5", "IP:admin-verify"],
        ],
        [3000, 1500, 2000, 2860]
      ),
      para("Implementation: Sliding window algorithm, in-memory Map per Worker isolate. Cleanup every 5 minutes."),

      // Section 4
      new Paragraph({ children: [new PageBreak()] }),
      h1("4. Security Architecture"),
      h2("7-Layer Security Model"),
      numbered("**Layer 1: Cloudflare WAF** \u2014 DDoS, bot mitigation, IP reputation", "numbers2"),
      numbered("**Layer 2: CORS** \u2014 Strict origin: FRONTEND_URL only", "numbers2"),
      numbered("**Layer 3: Security Headers** \u2014 CSP, HSTS, X-Frame-Options, nosniff, Permissions-Policy", "numbers2"),
      numbered("**Layer 4: Rate Limiting** \u2014 Per-IP sliding window on auth endpoints", "numbers2"),
      numbered("**Layer 5: Authentication** \u2014 Firebase JWT \u2192 PTOWL JWT in httpOnly cookies", "numbers2"),
      numbered("**Layer 6: Authorization** \u2014 Role-based: user vs admin, admin requires 2FA", "numbers2"),
      numbered("**Layer 7: Input Validation** \u2014 Zod schemas on all API inputs, parameterized SQL", "numbers2"),

      h2("Security Headers (Configured)"),
      makeTable(
        ["Header", "Value", "Purpose"],
        [
          ["Content-Security-Policy", "default-src 'self'; script-src 'self' challenges.cloudflare.com apis.google.com...", "Prevent XSS"],
          ["Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload", "Force HTTPS (2 years)"],
          ["X-Frame-Options", "DENY", "Prevent clickjacking"],
          ["X-Content-Type-Options", "nosniff", "Prevent MIME sniffing"],
          ["Referrer-Policy", "strict-origin-when-cross-origin", "Control referrer leakage"],
          ["Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()", "Disable browser features"],
        ],
        [2400, 4400, 2560]
      ),

      h2("JWT Token Design"),
      makeTable(
        ["Property", "Access Token", "Refresh Token"],
        [
          ["Algorithm", "HS256 (HMAC-SHA256)", "HS256"],
          ["Expiry", "1 hour", "7 days"],
          ["Storage", "httpOnly Secure SameSite=Lax cookie", "httpOnly Secure SameSite=Lax cookie"],
          ["Payload", "{ sub, email, role, tier, iat, exp }", "{ sub, type: 'refresh', iat, exp }"],
          ["Validation", "Cryptographic only (0 DB queries)", "Cryptographic + DB user lookup (1 query)"],
        ],
        [2000, 3680, 3680]
      ),

      h2("Password Hashing (Admin Only)"),
      bullet("Algorithm: PBKDF2-SHA256", "bullets"),
      bullet("Iterations: 100,000", "bullets"),
      bullet("Salt: 16 bytes (crypto.getRandomValues)", "bullets"),
      bullet("Output: 32 bytes", "bullets"),
      bullet("Storage: iterations:salt:hash (all base64)", "bullets"),

      h2("PII Protection: Sports Alias System"),
      bullet("676 two-letter combinations (AA-ZZ) mapped to sports figures", "bullets"),
      bullet("SHA-256 hash of initials determines alias deterministically", "bullets"),
      bullet("No real patient names stored anywhere in the system", "bullets"),
      bullet('Example: "LJ" \u2192 SHA-256 \u2192 index 423 \u2192 "LeBron James"', "bullets"),

      // Section 5
      new Paragraph({ children: [new PageBreak()] }),
      h1("5. Infrastructure"),
      h2("Cloudflare Configuration"),
      h3("Workers (API)"),
      bullet("Compatibility date: 2024-12-01", "bullets"),
      bullet("Compatibility flags: nodejs_compat", "bullets"),
      bullet("Routes: ptowl.com/api/*, www.ptowl.com/api/*", "bullets"),
      bullet("D1 binding: ptowl-db", "bullets"),
      bullet("Environment vars: ENVIRONMENT, FRONTEND_URL", "bullets"),
      bullet("Secrets: JWT_SECRET, ADMIN_EMAIL, EMAIL_API_KEY, TURNSTILE_SECRET_KEY, FIREBASE_PROJECT_ID", "bullets"),

      h3("Pages (Frontend)"),
      bullet("Build command: pnpm build:web", "bullets"),
      bullet("Build output: apps/web/dist", "bullets"),
      bullet("Root directory: /", "bullets"),
      bullet("Framework preset: None (custom Vite)", "bullets"),

      h3("D1 Database"),
      bullet("Name: ptowl-db", "bullets"),
      bullet("Migrations directory: src/migrations/", "bullets"),
      bullet("Free tier: 5GB storage, 5M reads/day, 100K writes/day", "bullets"),

      h2("Domain & DNS"),
      bullet("Registrar: Cloudflare", "bullets"),
      bullet("Domain: ptowl.com", "bullets"),
      bullet("SSL: Cloudflare Universal SSL (auto-renewed)", "bullets"),
      bullet("HSTS: Enabled with preload flag", "bullets"),

      // Section 6
      h1("6. CI/CD Pipeline"),
      h2("Production Pipeline (cloudbuild.yaml)"),
      para("Trigger: Push to main branch. Timeout: 600 seconds."),
      numbered("**Install Dependencies** \u2014 pnpm install --frozen-lockfile", "numbers3"),
      numbered("**Run Tests** \u2014 pnpm test (692 tests across 3 packages)", "numbers3"),
      numbered("**Build All Packages** \u2014 pnpm build (shared \u2192 api \u2192 web)", "numbers3"),
      numbered("**Deploy API Worker** \u2014 wrangler deploy (Cloudflare Workers)", "numbers3"),
      numbered("**Deploy Frontend** \u2014 wrangler pages deploy (Cloudflare Pages)", "numbers3"),

      h2("PR Validation Pipeline (cloudbuild-pr.yaml)"),
      para("Trigger: Pull request to main. Timeout: 300 seconds."),
      numbered("Install Dependencies", "numbers3"),
      numbered("Run Tests", "numbers3"),
      numbered("TypeCheck (no deployment)", "numbers3"),

      h2("Secrets Management"),
      bullet("Cloudflare secrets: wrangler secret put <NAME> (encrypted at rest)", "bullets"),
      bullet("Google Cloud Build secrets: Secret Manager (CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID)", "bullets"),
      bullet("Local development: .dev.vars file (gitignored)", "bullets"),

      // Section 7
      new Paragraph({ children: [new PageBreak()] }),
      h1("7. Environment Configuration"),
      h2("Development"),
      makeTable(
        ["Variable", "Value"],
        [
          ["ENVIRONMENT", "development"],
          ["FRONTEND_URL", "http://localhost:3000"],
          ["JWT_SECRET", "Test key (64-char hex)"],
          ["TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA (always-pass)"],
          ["D1", "Local SQLite via wrangler dev --local --persist-to .wrangler/state"],
        ],
        [3500, 5860]
      ),
      h2("Production"),
      makeTable(
        ["Variable", "Value"],
        [
          ["ENVIRONMENT", "production"],
          ["FRONTEND_URL", "https://ptowl.com"],
          ["JWT_SECRET", "Secret (64-char hex, set via wrangler secret)"],
          ["TURNSTILE_SECRET_KEY", "Real Cloudflare key"],
          ["FIREBASE_PROJECT_ID", "Real Firebase project ID"],
          ["ADMIN_EMAIL", "help@ptowl.com"],
          ["EMAIL_API_KEY", "Resend API key"],
          ["D1", "Remote ptowl-db"],
        ],
        [3500, 5860]
      ),

      // Section 8
      h1("8. Email Service"),
      h2("Provider: Resend API"),
      makeTable(
        ["Template", "Trigger", "Recipient"],
        [
          ["New user notification", "User registers via Firebase", "Admin (help@ptowl.com)"],
          ["User approved", "Admin approves user", "User's email"],
          ["User denied", "Admin denies user", "User's email"],
          ["Admin 2FA code", "Admin requests login code", "Admin email"],
        ],
        [3000, 3180, 3180]
      ),
      h3("Configuration"),
      bullet("From address: PTOWL <noreply@ptowl.com>", "bullets"),
      bullet("Free tier: 100 emails/day, 3,000/month", "bullets"),
      bullet("Delivery: Fire-and-forget via c.executionCtx.waitUntil() (non-blocking)", "bullets"),
      bullet("Failure handling: Graceful degradation \u2014 email failures don't block user operations", "bullets"),

      // Section 9
      h1("9. Testing Strategy"),
      h2("Test Distribution"),
      makeTable(
        ["Package", "Tests", "Focus"],
        [
          ["packages/shared", "130", "Schedule generator, input validation, PII protection"],
          ["apps/api", "488", "JWT, CSRF, OWASP, penetration, Turnstile, hardening"],
          ["apps/web", "74", "UI security, penetration testing"],
          ["**Total**", "**692**", ""],
        ],
        [3000, 1500, 4860]
      ),

      h2("Test Categories"),
      makeTable(
        ["Category", "Count", "Files"],
        [
          ["CSRF (comprehensive)", "~120", "csrf-comprehensive.test.ts, csrf.test.ts"],
          ["JWT (comprehensive)", "~150", "jwt-comprehensive.test.ts, jwt.test.ts"],
          ["OWASP Top 10", "~80", "owasp.test.ts"],
          ["Penetration testing", "~60", "penetration.test.ts (API + web)"],
          ["Turnstile bot protection", "~40", "turnstile-comprehensive.test.ts, turnstile.test.ts"],
          ["Security hardening", "~50", "hardening-comprehensive.test.ts"],
          ["Schedule generation", "~50", "schedule-generator.test.ts"],
          ["Input validation", "~80", "input.test.ts, schemas.test.ts"],
          ["PII protection", "~30", "pii.test.ts"],
          ["UI security", "~30", "ui-security.test.ts"],
        ],
        [3000, 1200, 5160]
      ),
      para("**Test Runner:** Vitest 2.1. CI gate: All 692 tests must pass before deployment."),

      // Section 10
      new Paragraph({ children: [new PageBreak()] }),
      h1("10. Monitoring & Observability"),
      makeTable(
        ["Capability", "Status", "Details"],
        [
          ["Error logging", "Basic", "console.error() in route catch blocks"],
          ["Audit trail", "Implemented", "audit_log table with action, detail, IP"],
          ["Health check", "Implemented", "GET /api/v1/health \u2192 { ok: true }"],
          ["Cloudflare analytics", "Available", "Request counts, error rates via CF dashboard"],
          ["Error monitoring (Sentry)", "Not implemented", "Planned"],
          ["Structured logging", "Not implemented", "Planned"],
          ["APM", "Not implemented", "No plans"],
        ],
        [3000, 2000, 4360]
      ),
      h2("Planned Improvements"),
      numbered("React Error Boundaries (catch render errors, show fallback)", "numbers3"),
      numbered("Structured JSON error logs (path, method, timestamp, requestId)", "numbers3"),
      numbered("Optional: Sentry free tier integration for error tracking", "numbers3"),

      // Section 11
      h1("11. Architecture Decision Records (ADRs)"),

      h2("ADR-001: Cloudflare over AWS/Vercel"),
      para("**Decision:** Use Cloudflare Pages + Workers + D1 as the full stack."),
      para("**Rationale:** Edge-first architecture with generous free tier. Pages + Workers + D1 + DNS + CDN + WAF all from one vendor at $0/month for the first ~1,000 users. Eliminates cold starts (V8 isolates, not containers)."),
      para("**Trade-offs:** D1 is SQLite (limited compared to Postgres). No stored procedures or triggers. Worker CPU limit of 50ms per request."),

      h2("ADR-002: Firebase Auth over Custom Auth"),
      para("**Decision:** Delegate user authentication to Firebase Auth (Google + Phone providers)."),
      para("**Rationale:** Reduces authentication attack surface dramatically. Firebase handles OAuth complexity, SMS delivery, token refresh, account recovery. PTOWL only needs to verify Firebase ID tokens (using jose library + Firebase public keys)."),
      para("**Trade-offs:** Dependency on Google. Firebase free tier: 10K phone auths/month."),

      h2("ADR-003: Sports Aliases over Encryption"),
      para('**Decision:** Map patient initials to sports figure names instead of encrypting real names.'),
      para('**Rationale:** "Zero PII" is stronger than "encrypted PII." If the database is compromised, there are no real names to decrypt. The 676-alias system (AA-ZZ \u2192 sports figures) provides human-readable labels without storing any Protected Health Information.'),
      para("**Trade-offs:** Only 676 unique aliases. Two patients with same initials get same alias."),

      h2("ADR-004: In-Memory Rate Limiting"),
      para("**Decision:** Use per-Worker-isolate in-memory Maps for rate limiting."),
      para("**Rationale:** Simplest possible implementation. Cloudflare typically routes same IP to same isolate. No external state store needed. Sufficient for current scale (100 users)."),
      para("**Trade-offs:** Not globally coordinated. A determined attacker hitting different edge locations could bypass. At 10K+ users, should migrate to Cloudflare WAF or Durable Objects."),

      h2("ADR-005: httpOnly Cookies over localStorage"),
      para("**Decision:** Store JWT tokens in httpOnly Secure SameSite cookies, not localStorage."),
      para("**Rationale:** httpOnly cookies cannot be read by JavaScript, preventing XSS-based token theft. Combined with SameSite=Lax, this also provides CSRF protection for GET requests. Signed CSRF tokens handle POST/PUT/DELETE."),
      para("**Trade-offs:** Requires cookie-aware CORS configuration. Cannot read tokens client-side (by design)."),

      h2("ADR-006: Monorepo over Multi-Repo"),
      para("**Decision:** Use pnpm workspace monorepo with packages/shared, apps/api, apps/web."),
      para("**Rationale:** Shared types and validators between frontend and backend ensure API contracts stay in sync. Atomic commits across packages. Single CI/CD pipeline tests everything together."),
      para("**Trade-offs:** Slightly more complex build configuration. Lock file is shared."),

      new Paragraph({ spacing: { before: 400 }, children: [
        new TextRun({ text: "This document is maintained alongside the codebase and updated as architecture evolves.", font: "Arial", size: 18, italics: true, color: "999999" })
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/nurel/OneDrive/Desktop/ptowl/docs/TDD.docx", buffer);
  console.log("TDD.docx created successfully");
});
