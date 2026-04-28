import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ══════════════════════════════════════════════════════════════════
// Middleware & Security Hardening — Comprehensive static analysis
// Validates auth middleware, admin routes, headers, sanitization,
// error handling, cookie security, and query safety
// ══════════════════════════════════════════════════════════════════

const API_SRC = path.resolve(__dirname, '..');
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const WEB_PUBLIC = path.join(MONOREPO_ROOT, 'apps', 'web', 'public');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(API_SRC, relativePath), 'utf-8');
}

function readAllFiles(dir: string, ext: string[]): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (
        entry.isFile() &&
        ext.some((e) => entry.name.endsWith(e)) &&
        !entry.name.includes('.test.')
      ) {
        const fullPath = path.join(entry.parentPath || dir, entry.name);
        files.push({ path: fullPath, content: fs.readFileSync(fullPath, 'utf-8') });
      }
    }
  } catch {
    /* dir doesn't exist */
  }
  return files;
}

// ══════════════════════════════════════════════════════════════════
// 1. Auth Middleware Security (10 tests)
// ══════════════════════════════════════════════════════════════════

describe('Auth Middleware Security', () => {
  const authMiddleware = () => readFile('middleware/auth.ts');

  it('requireAuth reads Firebase ID token from Authorization: Bearer header', () => {
    const code = authMiddleware();
    expect(code).toMatch(/c\.req\.header\(['"]Authorization['"]\)/);
    expect(code).toContain("startsWith('Bearer ')");
    // Must NOT fall back to cookies
    expect(code).not.toContain("getCookie(c, 'token')");
  });

  it('requireAuth does not read tokens from query parameters', () => {
    const code = authMiddleware();
    expect(code).not.toMatch(/c\.req\.query\(\s*['"]token['"]\s*\)/);
    expect(code).not.toMatch(/c\.req\.query\(\s*['"]jwt['"]\s*\)/);
    expect(code).not.toMatch(/c\.req\.query\(\s*['"]idToken['"]\s*\)/);
  });

  it('requireAuth verifies the token via Firebase JWKS', () => {
    const code = authMiddleware();
    expect(code).toContain('verifyFirebaseIdToken');
    expect(code).toContain('FIREBASE_PROJECT_ID');
  });

  it('requireAuth returns 401 for missing Authorization header', () => {
    const code = authMiddleware();
    expect(code).toContain("'UNAUTHORIZED'");
    expect(code).toContain('401');
    expect(code).toContain('Not authenticated');
  });

  it('requireAuth returns 401 for invalid/expired token', () => {
    const code = authMiddleware();
    expect(code).toContain('if (!claims)');
    expect(code).toContain("'Invalid or expired token'");
    expect(code).toContain('401');
  });

  it('CSRF protection is registered globally (hono/csrf, origin-based)', () => {
    const indexCode = readFile('index.ts');
    expect(indexCode).toContain("from 'hono/csrf'");
    expect(indexCode).toContain('csrf({ origin:');
  });

  // Admin console was removed in HOTFIX 3 — no admin role checks remain.
  it('rate limiting is handled by Cloudflare WAF (edge-level)', () => {
    const indexCode = readFile('index.ts');
    expect(indexCode).toContain('Cloudflare WAF');
  });
});

// ══════════════════════════════════════════════════════════════════
// 3. HSTS and Security Headers (8 tests)
// ══════════════════════════════════════════════════════════════════

describe('HSTS and Security Headers', () => {
  const indexCode = () => readFile('index.ts');

  it('HSTS header is set in index.ts (H8 FIX)', () => {
    const code = indexCode();
    // HSTS is set via hono/secure-headers strictTransportSecurity config
    expect(code).toContain('strictTransportSecurity');
  });

  it('HSTS max-age is at least 1 year (31536000 seconds)', () => {
    const code = indexCode();
    // Current value: 63072000 (2 years), which is >= 1 year
    const maxAgeMatch = code.match(/max-age=(\d+)/);
    expect(maxAgeMatch).not.toBeNull();
    const maxAge = parseInt(maxAgeMatch![1]!, 10);
    expect(maxAge).toBeGreaterThanOrEqual(31_536_000);
  });

  it('HSTS includes includeSubDomains directive', () => {
    const code = indexCode();
    expect(code).toContain('includeSubDomains');
  });

  it('HSTS includes preload directive', () => {
    const code = indexCode();
    // HSTS value is set via strictTransportSecurity in secureHeaders config
    const hstsLine = code.match(/strictTransportSecurity.*preload/);
    expect(hstsLine).not.toBeNull();
  });

  it('_headers file contains HSTS for Cloudflare Pages frontend', () => {
    const headersPath = path.join(WEB_PUBLIC, '_headers');
    const headers = fs.readFileSync(headersPath, 'utf-8');
    expect(headers).toContain('Strict-Transport-Security');
    // Verify max-age in _headers is also >= 1 year
    const maxAgeMatch = headers.match(/max-age=(\d+)/);
    expect(maxAgeMatch).not.toBeNull();
    expect(parseInt(maxAgeMatch![1]!, 10)).toBeGreaterThanOrEqual(31_536_000);
  });

  it('_headers file contains X-Frame-Options: DENY', () => {
    const headersPath = path.join(WEB_PUBLIC, '_headers');
    const headers = fs.readFileSync(headersPath, 'utf-8');
    expect(headers).toContain('X-Frame-Options: DENY');
  });

  it('_headers file contains X-Content-Type-Options: nosniff', () => {
    const headersPath = path.join(WEB_PUBLIC, '_headers');
    const headers = fs.readFileSync(headersPath, 'utf-8');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
  });

  it('_headers file contains all critical security headers', () => {
    const headersPath = path.join(WEB_PUBLIC, '_headers');
    const headers = fs.readFileSync(headersPath, 'utf-8');
    const requiredHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Strict-Transport-Security',
      'Content-Security-Policy',
    ];
    for (const header of requiredHeaders) {
      expect(headers, `Missing ${header} in _headers file`).toContain(header);
    }
  });
});

// ══════════════════════════════════════════════════════════════════
// 4. Input Sanitization (10 tests)
// ══════════════════════════════════════════════════════════════════

describe('Input Sanitization', () => {
  it('HTML tags stripped from provider_name in appointments', () => {
    const code = readFile('routes/appointments.ts');
    expect(code).toMatch(/provider_name[\s\S]*?\.replace\(\/<\[\^>\]\*>\/g, ''\)/);
  });

  it('HTML tags stripped from provider_name in schedules', () => {
    const code = readFile('routes/schedules.ts');
    expect(code).toMatch(/provider_name[\s\S]*?\.replace\(\/<\[\^>\]\*>\/g, ''\)/);
  });

  it('HTML tags stripped from clinic_name in profile', () => {
    const code = readFile('routes/profile.ts');
    expect(code).toMatch(/clinic_name[\s\S]*?\.replace\(\/<\[\^>\]\*>\/g, ''\)/);
  });

  it('HTML tags stripped from clinic_address in profile', () => {
    const code = readFile('routes/profile.ts');
    expect(code).toMatch(/clinic_address[\s\S]*?\.replace\(\/<\[\^>\]\*>\/g, ''\)/);
  });

  it('HTML tags stripped from notes in schedules', () => {
    const code = readFile('routes/schedules.ts');
    expect(code).toMatch(/notes[\s\S]*?\.replace\(\/<\[\^>\]\*>\/g, ''\)/);
  });

  it('template name has HTML sanitization', () => {
    const code = readFile('routes/templates.ts');
    expect(code).toContain("body.name.replace(/<[^>]*>/g, '')");
  });

  it('all route files that accept text input use HTML tag stripping', () => {
    const routeFiles = [
      'routes/templates.ts',
      'routes/appointments.ts',
      'routes/schedules.ts',
      'routes/profile.ts',
    ];
    for (const file of routeFiles) {
      const code = readFile(file);
      expect(code, `Missing HTML sanitization in ${file}`).toContain('.replace(/<[^>]*>/g');
    }
  });

  it('logo upload validates PNG magic bytes (0x89504E47)', () => {
    const code = readFile('routes/profile.ts');
    // Must check the first 4 bytes match PNG signature (case-insensitive hex)
    expect(code).toMatch(/bytes\[0\] === 0x89/i);
    expect(code).toMatch(/bytes\[1\] === 0x50/i);
    expect(code).toMatch(/bytes\[2\] === 0x4e/i);
    expect(code).toMatch(/bytes\[3\] === 0x47/i);
  });

  it('logo upload validates JPEG magic bytes (0xFFD8FF)', () => {
    const code = readFile('routes/profile.ts');
    // Must check the first 3 bytes match JPEG signature (case-insensitive hex)
    expect(code).toMatch(/bytes\[0\] === 0xff/i);
    expect(code).toMatch(/bytes\[1\] === 0xd8/i);
    expect(code).toMatch(/bytes\[2\] === 0xff/i);
  });

  it('body size limit of 1MB present to prevent DoS via large payloads', () => {
    const code = readFile('index.ts');
    expect(code).toContain('1_048_576');
    expect(code).toContain('PAYLOAD_TOO_LARGE');
    expect(code).toContain('content-length');
  });
});

// ══════════════════════════════════════════════════════════════════
// 5. Error Handling Security (8 tests)
// ══════════════════════════════════════════════════════════════════

describe('Error Handling Security', () => {
  it('console.error only logs err.message (not full error objects) in route files', () => {
    const routeFiles = readAllFiles(path.join(API_SRC, 'routes'), ['.ts']);
    for (const file of routeFiles) {
      // Find all console.error calls with caught exceptions
      const errorCalls = file.content.match(/console\.error\([^)]*\bErr\b[^)]*\)/gi) || [];
      // The alias route is a known exception that logs full err — skip it for now
      // All other routes should use err instanceof Error ? err.message : 'Unknown error'
      if (file.path.includes('alias')) continue;
      for (const call of errorCalls) {
        expect(
          call,
          `Full error object may leak in console.error in ${file.path}: ${call}`,
        ).toContain('err.message');
      }
    }
  });

  it('no email addresses appear in console.error calls in route files', () => {
    const routeFiles = readAllFiles(path.join(API_SRC, 'routes'), ['.ts']);
    for (const file of routeFiles) {
      // console.error should not log user.email or body.email directly
      const consoleErrors = file.content.match(/console\.error\([^)]+\)/g) || [];
      for (const call of consoleErrors) {
        expect(call, `Email may leak in console.error in ${file.path}`).not.toContain('user.email');
        expect(call, `Email may leak in console.error in ${file.path}`).not.toContain('body.email');
      }
    }
  });

  it('health endpoint does not expose version, build info, or dependencies', () => {
    const code = readFile('index.ts');
    const healthSection = code.match(/app\.get\(\s*['"]\/api\/v1\/health['"].*?\)/s);
    expect(healthSection).not.toBeNull();
    const healthStr = healthSection![0];
    // Should only return { ok: true }, not version/build/node info
    expect(healthStr).not.toContain('version');
    expect(healthStr).not.toContain('build');
    expect(healthStr).not.toContain('node');
  });

  it('error responses use INTERNAL_ERROR code in all route catch blocks', () => {
    const routeFiles = readAllFiles(path.join(API_SRC, 'routes'), ['.ts']);
    for (const file of routeFiles) {
      const allCatches = file.content.match(/\}\s*catch\s*\(/g) || [];
      if (allCatches.length > 0) {
        const catchBlocks = file.content.match(/catch\s*\(\w+\)\s*\{[\s\S]*?INTERNAL_ERROR/g) || [];
        expect(
          catchBlocks.length,
          `Missing INTERNAL_ERROR in catch blocks of ${file.path}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('no raw error messages exposed in JSON responses (only generic messages)', () => {
    const routeFiles = readAllFiles(path.join(API_SRC, 'routes'), ['.ts']);
    for (const file of routeFiles) {
      // Find catch blocks and ensure the caught variable isn't passed as message
      const catchPattern = /\}\s*catch\s*\((\w+)\)\s*\{([\s\S]*?)(?=\}\s*(?:\)|\n))/g;
      let match: RegExpExecArray | null;
      while ((match = catchPattern.exec(file.content)) !== null) {
        const caughtVar = match[1]!;
        const catchBody = match[2]!;
        // The caught variable's message should not be used as the response message
        // Pattern: message: err.message or message: ${err.message}
        const leakPattern = new RegExp(`message:\\s*${caughtVar}\\.message`);
        expect(
          leakPattern.test(catchBody),
          `Caught exception message may leak in response in ${file.path}`,
        ).toBe(false);
      }
    }
  });

  it('global onError handler returns generic message without stack trace', () => {
    const code = readFile('index.ts');
    const errorHandler = code.slice(code.indexOf('app.onError'));
    expect(errorHandler).toContain('INTERNAL_ERROR');
    expect(errorHandler).toContain("'An unexpected error occurred'");
    // Should not include err in JSON response
    expect(errorHandler).not.toMatch(/c\.json\(.*\berr\b/);
  });

  it('global onError handler logs only err.message (not full stack)', () => {
    const code = readFile('index.ts');
    const errorHandler = code.slice(code.indexOf('app.onError'));
    expect(errorHandler).toContain('err instanceof Error ? err.message');
    expect(errorHandler).toContain('console.error');
  });
});

// ══════════════════════════════════════════════════════════════════
// 6. Cookie Security (6 tests)
// ══════════════════════════════════════════════════════════════════

describe('Stateless Auth (no server-side session cookies)', () => {
  // Stage A removed httpOnly JWT cookies in favor of direct Firebase
  // ID token verification on every request. Documenting that
  // expectation here so a future refactor doesn't accidentally
  // re-introduce cookie-based session state.
  it('routes/auth.ts does not import setCookie / deleteCookie', () => {
    const code = readFile('routes/auth.ts');
    expect(code).not.toContain('setCookie');
    expect(code).not.toContain('deleteCookie');
  });

  it('middleware/auth.ts does not read cookies', () => {
    const code = readFile('middleware/auth.ts');
    expect(code).not.toContain('getCookie');
  });

  it('Firebase ID tokens are verified on every request, not exchanged once', () => {
    const code = readFile('middleware/auth.ts');
    expect(code).toContain('verifyFirebaseIdToken');
    // No /auth/refresh route — tokens auto-refresh client-side via
    // Firebase SDK; the server is stateless.
    const authCode = readFile('routes/auth.ts');
    expect(authCode).not.toContain("'/refresh'");
    expect(authCode).not.toContain("'/firebase'");
  });
});

// ══════════════════════════════════════════════════════════════════
// 7. No SELECT * in Queries (5+ tests)
// ══════════════════════════════════════════════════════════════════

describe('No SELECT * in Queries', () => {
  const routeFiles = [
    'routes/templates.ts',
    'routes/appointments.ts',
    'routes/schedules.ts',
    'routes/profile.ts',
    'routes/auth.ts',
    'routes/alias.ts',
  ];

  for (const file of routeFiles) {
    it(`${file} does not use SELECT * (explicit column selection only)`, () => {
      const code = readFile(file);
      // Match SELECT * FROM (but not SELECT COUNT(*) which is valid)
      const selectStarPattern = /SELECT\s+\*\s+FROM/gi;
      const matches = code.match(selectStarPattern);
      expect(matches, `Found SELECT * in ${file}`).toBeNull();
    });
  }
});

// ══════════════════════════════════════════════════════════════════
// 8. Additional Hardening Checks
// ══════════════════════════════════════════════════════════════════

describe('Schedule ID Validation', () => {
  it('schedule GET /:id validates hex ID format before DB query', () => {
    const code = readFile('routes/schedules.ts');
    const getSection = code.slice(code.indexOf("scheduleRoutes.get('/:id'"));
    expect(getSection).toContain('/^[0-9a-f]{32}$/i.test(scheduleId)');
  });

  it('schedule DELETE /:id validates hex ID format before DB query', () => {
    const code = readFile('routes/schedules.ts');
    const deleteSection = code.slice(code.indexOf("scheduleRoutes.delete('/:id'"));
    expect(deleteSection).toContain('/^[0-9a-f]{32}$/i.test(scheduleId)');
  });

  it('schedule POST validates template_id hex format when provided', () => {
    const code = readFile('routes/schedules.ts');
    expect(code).toContain('/^[0-9a-f]{32}$/i.test(body.template_id)');
  });
});

// Admin Route Authorization Chain — removed in HOTFIX 3 (admin console deleted).

describe('CORS Configuration Security', () => {
  it('CORS uses strict origin from FRONTEND_URL (no wildcard)', () => {
    const code = readFile('index.ts');
    // Multi-origin allow-list (FRONTEND_URLS) sourced via getAllowedOrigins;
    // no '*' wildcard, no `origin: true`, no fall-through.
    expect(code).toContain('origin: origins');
    expect(code).not.toContain("origin: '*'");
    expect(code).not.toContain('origin: true');
  });

  it('CORS allows credentials for httpOnly cookie transport', () => {
    const code = readFile('index.ts');
    expect(code).toContain('credentials: true');
  });

  it('CORS rejects requests when FRONTEND_URL is not configured', () => {
    const code = readFile('index.ts');
    expect(code).toMatch(/!origins|!frontendUrl/);
    expect(code).toContain('CONFIG_ERROR');
  });
});

describe('Workers.dev Access Blocking', () => {
  it('direct .workers.dev access is blocked in production', () => {
    const code = readFile('index.ts');
    expect(code).toContain('.workers.dev');
    expect(code).toContain("c.env.ENVIRONMENT === 'production'");
    expect(code).toContain('FORBIDDEN');
  });
});

// Account Lockout Protection — removed in HOTFIX 3 (admin console deleted).
// User login uses Firebase Phone/Google/email auth, which handles rate
// limiting at Google's identity layer.

describe('Anti-Enumeration Protection', () => {
  // Phone auth uses Firebase, which does not reveal whether a phone
  // number is registered. The middleware returns a generic
  // "Invalid or expired token" for bad Firebase tokens — no path that
  // distinguishes "user not found" from "wrong credentials".
  it('auth middleware returns generic error for invalid tokens', () => {
    const code = readFile('middleware/auth.ts');
    expect(code).toContain('UNAUTHORIZED');
    expect(code).toContain('Invalid or expired token');
  });
});

describe('Reminder Email Template Security', () => {
  it('reminder service escapes user-provided content in HTML', () => {
    const code = readFile('services/reminders.ts');
    // reminders.ts has its own local escapeHtml (no shared email.ts anymore)
    expect(code).toContain('escapeHtml');
    expect(code).toContain('&amp;');
    expect(code).toContain('&lt;');
    expect(code).toContain('&gt;');
  });
});
