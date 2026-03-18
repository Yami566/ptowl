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
function checkItem(text) {
  const runs = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  for (const part of parts) {
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push(new TextRun({ ...boldRun, text: part.slice(2, -2) }));
    } else {
      runs.push(new TextRun({ ...bodyRun, text: part }));
    }
  }
  return new Paragraph({
    numbering: { reference: "checks", level: 0 },
    spacing: { after: 60 },
    children: runs
  });
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

const doc = new Document({
  numbering: {
    config: [
      { reference: "checks", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u25A1", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
      ]},
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
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
          children: [new TextRun({ text: "PTOWL Validation Checklist", font: "Arial", size: 16, color: "999999" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC", space: 1 } },
          children: [
            new TextRun({ text: "PTOWL Validation Checklist v1.0  |  Page ", font: "Arial", size: 16, color: "999999" }),
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
        children: [new TextRun({ text: "Validation Checklist", font: "Arial", size: 36, color: "666666" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "Version 1.0  |  March 16, 2026", font: "Arial", size: 22, color: "999999" })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
        children: [new TextRun({ text: "Status: Active", font: "Arial", size: 22, color: "2D6A4F", bold: true })] }),
      para("Items marked [BUILT] exist in production. Items marked [PLANNED] are in the roadmap but not yet implemented.", { alignment: AlignmentType.CENTER, spacing: { before: 400, after: 120 } }),
      new Paragraph({ children: [new PageBreak()] }),

      // 1. Authentication Flows
      h1("1. Authentication Flows"),
      h2("Google Sign-In [BUILT]"),
      checkItem('Click "Sign in with Google" on /login'),
      checkItem("Google OAuth popup appears"),
      checkItem("Select Google account \u2192 popup closes"),
      checkItem("User created with status: pending (first login) OR logged in (returning user)"),
      checkItem("httpOnly cookies set (access_token, refresh_token, csrf_token)"),
      checkItem("Redirected to /dashboard (approved) or /pending (pending approval)"),

      h2("Phone SMS Auth [BUILT]"),
      checkItem("Enter phone number on /login"),
      checkItem("SMS verification code received"),
      checkItem("Enter 6-digit code"),
      checkItem("User created/logged in"),
      checkItem("Cookies set, redirected appropriately"),

      h2("Admin Login [BUILT]"),
      checkItem("Navigate to /admin"),
      checkItem("Enter admin email (help@ptowl.com) and password"),
      checkItem("Receive 2FA code via email"),
      checkItem("Enter 6-digit code"),
      checkItem("Admin panel loads with user management"),

      h2("Admin 2FA [BUILT]"),
      checkItem("2FA code expires after 5 minutes"),
      checkItem("Max 5 verification attempts per minute (rate limited)"),
      checkItem("Invalid code shows error message"),
      checkItem("Code is single-use (cannot reuse)"),

      h2("Logout [BUILT]"),
      checkItem("Click logout button"),
      checkItem("access_token, refresh_token, csrf_token cookies cleared"),
      checkItem("Redirected to /login"),
      checkItem("Cannot access /dashboard after logout (redirected)"),

      h2("Session Refresh [BUILT]"),
      checkItem("Access token expires after 1 hour"),
      checkItem("Refresh token automatically obtains new access token"),
      checkItem("Refresh token expires after 7 days \u2192 user must re-login"),

      // 2. Dashboard
      new Paragraph({ children: [new PageBreak()] }),
      h1("2. Dashboard"),
      h2("Template Cards [BUILT]"),
      checkItem("5 template cards displayed (hotkeys 2-6)"),
      checkItem('Card 1 shows "Create New Routine" (Custom Wizard)'),
      checkItem("Each card shows: name, sessions/week, duration, hotkey number"),
      checkItem("Cards are keyboard-accessible"),

      h2("Hotkey Shortcuts [BUILT]"),
      checkItem("Press 1 \u2192 Custom Wizard opens"),
      checkItem("Press 2 \u2192 Post-Op Knee Rehab selected"),
      checkItem("Press 3 \u2192 Shoulder Recovery selected"),
      checkItem("Press 4 \u2192 Low Back Pain Program selected"),
      checkItem("Press 5 \u2192 Sports Injury Rehab selected"),
      checkItem("Press 6 \u2192 Balance & Fall Prevention selected"),
      checkItem("Hotkeys don't fire when typing in input fields"),

      h2("Saved Schedules List [BUILT]"),
      checkItem("Previously created schedules displayed in list"),
      checkItem("Shows: patient alias, template name, date range, created date"),
      checkItem("Click schedule \u2192 preview overlay opens"),
      checkItem("Pagination works (20 per page)"),
      checkItem("Empty state shown when no schedules exist"),

      // 3. Schedule Wizard
      h1("3. Schedule Wizard"),
      h2("3-Keypress Flow (Hotkeys 2-6) [BUILT]"),
      checkItem("Press hotkey \u2192 initials input modal appears"),
      checkItem('Type 2-letter initials (e.g., "LJ")'),
      checkItem("Press Enter \u2192 schedule generated"),
      checkItem('Sports alias assigned (e.g., "LeBron James")'),
      checkItem("Appointments created in database"),
      checkItem("Preview overlay opens automatically"),

      h2("Custom Wizard (Hotkey 1) [BUILT]"),
      checkItem("Step 1: Select or name a template"),
      checkItem("Step 2: Enter patient initials"),
      checkItem("Step 3: Choose start date"),
      checkItem("Step 4: Set frequency (sessions/week) and duration (weeks)"),
      checkItem("Step 5: Set default appointment time"),
      checkItem("Step 6: Review all details and confirm"),
      checkItem("Back button works at each step"),
      checkItem("Escape closes wizard"),

      h2("All 6 Templates [BUILT]"),
      checkItem("Template 2: Post-Op Knee Rehab (3x/wk, 8 wks = 24 appointments)"),
      checkItem("Template 3: Shoulder Recovery (3x/wk, 6 wks = 18 appointments)"),
      checkItem("Template 4: Low Back Pain Program (2x/wk, 4 wks = 8 appointments)"),
      checkItem("Template 5: Sports Injury Rehab (3x/wk, 4 wks = 12 appointments)"),
      checkItem("Template 6: Balance & Fall Prevention (2x/wk, 12 wks = 24 appointments)"),
      checkItem("Custom Wizard (1): User-defined parameters"),

      // 4. Schedule Preview
      new Paragraph({ children: [new PageBreak()] }),
      h1("4. Schedule Preview"),
      h2("Table View [BUILT]"),
      checkItem("Appointments displayed in table format"),
      checkItem("Columns: Week #, Date, Time, Provider, Reminder"),
      checkItem("Grouped by week"),
      checkItem("Scrollable for long schedules"),

      h2("Calendar View [BUILT]"),
      checkItem("FullCalendar renders with appointments"),
      checkItem("Month/week/day views available"),
      checkItem("Appointments show as events on correct dates"),
      checkItem("Click event \u2192 shows appointment details"),

      h2("Print Preview [BUILT]"),
      checkItem("Print button triggers window.print()"),
      checkItem("Print-optimized CSS hides UI elements"),
      checkItem("Clinic header appears if configured"),
      checkItem("Logo appears if uploaded"),
      checkItem("Notes section appears if enabled in print settings"),

      h2("Schedule Delete [PLANNED \u2014 Iteration 1]"),
      checkItem("Delete button visible in preview overlay"),
      checkItem("Confirmation dialog before deletion"),
      checkItem("Schedule and appointments removed from database"),
      checkItem("Overlay closes, dashboard refreshes"),

      // 5. Profile
      h1("5. Profile"),
      h2("View Profile [BUILT]"),
      checkItem("Email displayed"),
      checkItem("Tier displayed (free/paid)"),
      checkItem("Account status displayed"),

      h2("Edit Clinic Info [BUILT]"),
      checkItem("Edit clinic name"),
      checkItem("Edit clinic address"),
      checkItem("Edit clinic phone"),
      checkItem("Edit clinic email"),
      checkItem("Save button \u2192 PUT /api/v1/profile"),
      checkItem("Success message shown"),

      h2("Logo Upload [PLANNED \u2014 Iteration 1]"),
      checkItem("File input accepts PNG/JPEG only"),
      checkItem("Client-side size validation (500KB max)"),
      checkItem("Upload preview thumbnail"),
      checkItem("Logo appears in print preview header"),
      checkItem("Remove logo button"),

      h2("Account Deletion [PLANNED \u2014 Iteration 1]"),
      checkItem('"Delete Account" button in danger zone'),
      checkItem('Confirmation: user types "DELETE"'),
      checkItem("All data cascade-deleted (schedules, appointments, templates, profile)"),
      checkItem("Logged out and redirected to /login"),
      checkItem("Audit log entry created"),

      // 6. Templates
      new Paragraph({ children: [new PageBreak()] }),
      h1("6. Templates"),
      h2("View Templates [BUILT]"),
      checkItem("Template editor page lists all user templates"),
      checkItem("Shows: name, hotkey, sessions/week, duration, active status"),

      h2("Edit Templates [BUILT]"),
      checkItem("Change template name"),
      checkItem("Change sessions per week (1-7)"),
      checkItem("Change duration (1-52 weeks)"),
      checkItem("Change default time"),
      checkItem("Toggle active/inactive"),
      checkItem("Save \u2192 PUT /api/v1/templates/:id"),

      h2("Create Template [PLANNED \u2014 Iteration 3]"),
      checkItem('"Add Template" button'),
      checkItem("Assign to unused hotkey (7-9)"),
      checkItem("Set name, frequency, duration, time"),
      checkItem("409 error if hotkey already in use"),

      h2("Delete Template [PLANNED \u2014 Iteration 3]"),
      checkItem("Delete button per template"),
      checkItem("Confirmation dialog"),
      checkItem("Schedules with this template keep their data (template_id \u2192 NULL)"),

      // 7. Export
      h1("7. Export"),
      h2("PDF Download [PLANNED \u2014 Iteration 4]"),
      checkItem('"Download PDF" button in schedule preview'),
      checkItem("PDF matches print layout (header, logo, table, notes)"),
      checkItem("File name: [alias]-schedule-[date].pdf"),
      checkItem("Works offline after page load"),

      h2("Calendar Export (.ics) [PLANNED \u2014 Iteration 4]"),
      checkItem('"Export to Calendar" button in schedule preview'),
      checkItem("Valid iCalendar file generated"),
      checkItem("One VEVENT per appointment"),
      checkItem("File name: [alias]-appointments.ics"),
      checkItem("Imports correctly into Google Calendar"),
      checkItem("Imports correctly into Outlook"),
      checkItem("Imports correctly into Apple Calendar"),

      // 8. Admin Panel
      new Paragraph({ children: [new PageBreak()] }),
      h1("8. Admin Panel"),
      h2("User Management [BUILT]"),
      checkItem("List all users with status, role, tier, created date"),
      checkItem("Pending users highlighted"),
      checkItem('Approve button \u2192 user status changes to "approved"'),
      checkItem('Deny button \u2192 user status changes to "denied"'),
      checkItem("Email sent to user on approve/deny"),

      h2("Audit Log [BUILT]"),
      checkItem("View recent admin actions"),
      checkItem("Shows: action, user, IP, timestamp"),
      checkItem("Actions logged: login, code sent, code failed, verified, approve, deny"),

      h2("Admin Stats [PLANNED \u2014 Iteration 6]"),
      checkItem("Total users count"),
      checkItem("Active users (last 7 days)"),
      checkItem("Total schedules created"),
      checkItem("Schedules created this week"),
      checkItem("Popular templates"),

      // 9. Security
      h1("9. Security"),
      h2("CSRF Protection [BUILT]"),
      checkItem("csrf_token cookie set on login"),
      checkItem("X-CSRF-Token header required on POST/PUT/PATCH/DELETE"),
      checkItem("Missing header \u2192 403 Forbidden"),
      checkItem("Invalid token \u2192 403 Forbidden"),
      checkItem("Token is HMAC-SHA256 signed"),

      h2("JWT Session Security [BUILT]"),
      checkItem("Tokens stored in httpOnly cookies (not accessible via JavaScript)"),
      checkItem("Secure flag set (HTTPS only)"),
      checkItem("SameSite=Lax set"),
      checkItem("Access token expires in 1 hour"),
      checkItem("Refresh token expires in 7 days"),
      checkItem("Invalid token \u2192 401 Unauthorized"),

      h2("Rate Limiting [BUILT]"),
      checkItem("/auth/firebase: max 10 req/min"),
      checkItem("/auth/refresh: max 20 req/min"),
      checkItem("/admin/login: max 5 req/min"),
      checkItem("/admin/send-code: max 3 req/min"),
      checkItem("/admin/verify-code: max 5 req/min"),
      checkItem("Exceeded \u2192 429 Too Many Requests"),

      h2("Security Headers [BUILT]"),
      checkItem("Content-Security-Policy present and restrictive"),
      checkItem("Strict-Transport-Security: max-age=63072000 (2 years)"),
      checkItem("X-Frame-Options: DENY"),
      checkItem("X-Content-Type-Options: nosniff"),
      checkItem("Referrer-Policy: strict-origin-when-cross-origin"),
      checkItem("Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()"),

      h2("Input Validation [BUILT]"),
      checkItem("All API inputs validated with Zod schemas"),
      checkItem("SQL injection impossible (parameterized queries only)"),
      checkItem("XSS prevented (no dangerouslySetInnerHTML, CSP blocks inline scripts)"),
      checkItem("Request body size limited to 1MB"),
      checkItem("Template ID validates as 32-char hex: /^[0-9a-f]{32}$/i"),
      checkItem("Logo upload validates magic bytes (PNG: 89504E47, JPEG: FFD8FF)"),

      h2("CORS [BUILT]"),
      checkItem("Only FRONTEND_URL origin allowed"),
      checkItem("Credentials: true (cookies sent cross-origin)"),
      checkItem("Direct Worker URL access blocked in production"),

      h2("Bot Protection [BUILT]"),
      checkItem("Cloudflare Turnstile widget on auth forms"),
      checkItem("Token verified server-side via Turnstile API"),
      checkItem("Test key used in development (always passes)"),

      // 10. API Health
      new Paragraph({ children: [new PageBreak()] }),
      h1("10. API Health"),
      h2("Health Check [BUILT]"),
      checkItem("GET /api/v1/health returns { ok: true } with 200 status"),
      checkItem("Response time < 50ms"),

      h2("Error Handling [BUILT]"),
      checkItem("Unknown routes \u2192 404 { ok: false, error: { code: 'NOT_FOUND' } }"),
      checkItem("Unhandled errors \u2192 500 { ok: false, error: { code: 'INTERNAL_ERROR' } }"),
      checkItem("Auth required \u2192 401 { ok: false, error: { code: 'UNAUTHORIZED' } }"),
      checkItem("CSRF missing \u2192 403 { ok: false, error: { code: 'CSRF_MISSING' } }"),
      checkItem("Rate limited \u2192 429 { ok: false, error: { code: 'RATE_LIMITED' } }"),
      checkItem("Payload too large \u2192 413 { ok: false, error: { code: 'PAYLOAD_TOO_LARGE' } }"),

      // 11. Cross-Browser
      h1("11. Cross-Browser Testing"),
      h2("Desktop Browsers"),
      checkItem("Chrome 90+ (primary development browser)"),
      checkItem("Firefox 90+"),
      checkItem("Safari 15+"),
      checkItem("Edge 90+"),

      h2("Mobile Browsers"),
      checkItem("iOS Safari 15+"),
      checkItem("Chrome for Android"),
      checkItem("Responsive layout at 320px width"),
      checkItem("Responsive layout at 768px width"),
      checkItem("Responsive layout at 1024px width"),

      // 12. Accessibility
      h1("12. Accessibility"),
      h2("Keyboard Navigation [BUILT]"),
      checkItem("Tab order follows logical reading order"),
      checkItem("All interactive elements reachable via Tab"),
      checkItem("Hotkeys 1-6 work on dashboard"),
      checkItem("Enter submits forms"),
      checkItem("Escape closes modals/overlays"),

      h2("Screen Reader [BUILT]"),
      checkItem("Skip-to-main-content link present"),
      checkItem("Form inputs have associated labels"),
      checkItem("Error messages announced"),
      checkItem("ARIA roles on modal overlays"),
      checkItem("Images have alt text"),

      h2("Focus Management [BUILT]"),
      checkItem("Focus trapped in modal overlays"),
      checkItem("Focus returns to trigger element when modal closes"),
      checkItem("Focus visible indicator on all interactive elements"),
      checkItem("No focus loss during page transitions"),

      h2("Color Contrast [BUILT]"),
      checkItem("Green (#2d6a4f) on white: ratio >= 4.5:1 (AA)"),
      checkItem("Orange (#e76f51) on white: verify ratio meets AA"),
      checkItem("Text on dark backgrounds: verify ratio >= 4.5:1"),
      checkItem("Error text clearly distinguishable (not color-only indication)"),

      // 13-16 Planned sections
      new Paragraph({ children: [new PageBreak()] }),
      h1("13. Error Boundaries [PLANNED \u2014 Iteration 2]"),
      checkItem("React ErrorBoundary wraps all routes"),
      checkItem('Render error shows "Something went wrong" fallback'),
      checkItem("Refresh button reloads the page"),
      checkItem("Error logged to console with component stack"),
      checkItem("One page crash doesn't break navigation to other pages"),

      h1("14. Structured API Logging [PLANNED \u2014 Iteration 2]"),
      checkItem("All API errors logged as JSON: { error, path, method, timestamp }"),
      checkItem("Consistent format across all route catch blocks"),
      checkItem("Visible in Cloudflare Workers dashboard logs"),

      h1("15. Database Backups [PLANNED \u2014 Iteration 5]"),
      checkItem("Automated backup runs daily"),
      checkItem("Backup stored in R2 bucket or Time Travel enabled"),
      checkItem("Restore procedure documented and tested"),
      checkItem("Backup retention: 30 days minimum"),

      h1("16. Daily Digest Email [PLANNED \u2014 Iteration 5]"),
      checkItem("Cron trigger runs daily (7 AM UTC)"),
      checkItem("Email sent to PT's clinic_email"),
      checkItem("Lists tomorrow's appointments: alias, time"),
      checkItem("No email sent if no appointments tomorrow"),
      checkItem("Respects Resend rate limits"),

      new Paragraph({ spacing: { before: 400 }, children: [
        new TextRun({ text: "Check each box as you verify. Run this checklist after every deployment.", font: "Arial", size: 18, italics: true, color: "999999" })
      ]}),
    ]
  }]
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync("C:/Users/nurel/OneDrive/Desktop/ptowl/docs/VALIDATION-CHECKLIST.docx", buffer);
  console.log("VALIDATION-CHECKLIST.docx created successfully");
});
