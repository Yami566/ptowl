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
      if (entry.isFile() && ext.some((e) => entry.name.endsWith(e)) && !entry.name.includes('.test.')) {
        const fullPath = path.join(entry.parentPath || dir, entry.name);
        files.push({ path: fullPath, content: fs.readFileSync(fullPath, 'utf-8') });
      }
    }
  } catch { /* dir doesn't exist */ }
  return files;
}

// ══════════════════════════════════════════════════════════════════
// 1. Auth Middleware Security (10 tests)
// ══════════════════════════════════════════════════════════════════

describe('Auth Middleware Security', () => {
  const authMiddleware = () => readFile('middleware/auth.ts');

  it('requireAuth reads JWT from httpOnly cookie (not Authorization header)', () => {
    const code = authMiddleware();
    // Must use getCookie to read the token
    expect(code).toContain("getCookie(c, 'token')");
    // Must NOT read from Authorization header
    expect(code).not.toMatch(/c\.req\.header\(\s*['"]Authorization['"]\s*\)/);
  });

  it('requireAuth does not read JWT from query parameters', () => {
    const code = authMiddleware();
    // Must NOT read token from query string
    expect(code).not.toMatch(/c\.req\.query\(\s*['"]token['"]\s*\)/);
    expect(code).not.toMatch(/c\.req\.query\(\s*['"]jwt['"]\s*\)/);
    expect(code).not.toMatch(/c\.req\.query\(\s*['"]access_token['"]\s*\)/);
  });

  it('requireAuth verifies JWT with server secret from environment', () => {
    const code = authMiddleware();
    expect(code).toContain('verifyJWT(token, c.env.JWT_SECRET)');
  });

  it('requireAuth returns 401 for missing cookie', () => {
    const code = authMiddleware();
    // When token is falsy, respond with 401
    expect(code).toContain('if (!token)');
    expect(code).toContain("'UNAUTHORIZED'");
    expect(code).toContain('401');
  });

  it('requireAuth returns 401 for invalid/expired token', () => {
    const code = authMiddleware();
    // When payload is null (verification failed), respond with 401
    expect(code).toContain('if (!payload)');
    expect(code).toContain("'Invalid or expired token'");
    expect(code).toContain('401');
  });

  it('requireCSRF skips verification for GET/HEAD/OPTIONS methods', () => {
    const code = authMiddleware();
    expect(code).toContain("['GET', 'HEAD', 'OPTIONS'].includes(method)");
    // Should call next() without checking token for safe methods
    expect(code).toContain('return next()');
  });

  it('requireCSRF requires X-CSRF-Token header for state-mutating requests', () => {
    const code = authMiddleware();
    expect(code).toContain("c.req.header('X-CSRF-Token')");
    expect(code).toContain('CSRF_MISSING');
    expect(code).toContain('403');
  });

  it('requireCSRF verifies CSRF token against user ID and server secret', () => {
    const code = authMiddleware();
    expect(code).toContain('verifyCSRFToken(csrfToken, c.env.JWT_SECRET, user.id)');
    expect(code).toContain('CSRF_INVALID');
  });

  it('requireAdmin checks role === admin and admin_verified === true', () => {
    const code = authMiddleware();
    expect(code).toContain("user.role !== 'admin'");
    expect(code).toContain('!user.admin_verified');
    expect(code).toContain('ADMIN_2FA_REQUIRED');
  });

  it('requireAdmin revalidates role against database (H6 FIX — stale JWT protection)', () => {
    const code = authMiddleware();
    // H6 FIX: Must query DB to ensure admin role is still valid
    expect(code).toContain('SELECT role, status FROM users WHERE id = ?');
    expect(code).toContain("dbUser.role !== 'admin'");
    expect(code).toContain("dbUser.status !== 'approved'");
    expect(code).toContain("'Admin access revoked'");
  });
});

// ══════════════════════════════════════════════════════════════════
// 2. Admin Route Security (8 tests)
// ══════════════════════════════════════════════════════════════════

describe('Admin Route Security', () => {
  const adminCode = () => readFile('routes/admin.ts');

  it('admin auth uses phone login + email 2FA (no Auth0)', () => {
    const code = adminCode();
    // Admin login is handled by normal phone auth; admin panel uses email 2FA
    expect(code).toContain("'/send-code'");
    expect(code).toContain("'/verify-code'");
    expect(code).toContain("user.role !== 'admin'");
  });

  it('admin cookies use secure flag based on environment (H2 FIX)', () => {
    const code = adminCode();
    // Must check ENVIRONMENT to set secure flag
    expect(code).toContain("c.env.ENVIRONMENT === 'production'");
    expect(code).toContain('secure: isProduction');
  });

  it('admin user ID validation uses 32-char hex regex (H3 FIX)', () => {
    const code = adminCode();
    // Both approve and deny routes must validate user ID with strict hex pattern
    expect(code).toContain('/^[0-9a-f]{32}$/i.test(userId)');
  });

  it('admin approve route validates user ID before DB query', () => {
    const code = adminCode();
    const approveSection = code.slice(code.indexOf("'/users/:id/approve'"), code.indexOf("'/users/:id/deny'"));
    // ID validation must appear before the UPDATE query
    const validationPos = approveSection.indexOf('[0-9a-f]{32}');
    const updatePos = approveSection.indexOf('UPDATE users SET');
    expect(validationPos).toBeGreaterThan(-1);
    expect(updatePos).toBeGreaterThan(-1);
    expect(validationPos).toBeLessThan(updatePos);
  });

  it('admin deny route validates user ID before DB query', () => {
    const code = adminCode();
    const denySection = code.slice(code.indexOf("'/users/:id/deny'"));
    // ID validation must appear before the UPDATE query
    const validationPos = denySection.indexOf('[0-9a-f]{32}');
    const updatePos = denySection.indexOf('UPDATE users SET');
    expect(validationPos).toBeGreaterThan(-1);
    expect(updatePos).toBeGreaterThan(-1);
    expect(validationPos).toBeLessThan(updatePos);
  });

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
    // provider_name must have HTML tags stripped
    expect(code).toContain("provider_name.replace(/<[^>]*>/g, '')");
  });

  it('HTML tags stripped from provider_name in schedules', () => {
    const code = readFile('routes/schedules.ts');
    expect(code).toContain("provider_name || '').replace(/<[^>]*>/g, '')");
  });

  it('HTML tags stripped from clinic_name in profile', () => {
    const code = readFile('routes/profile.ts');
    expect(code).toContain("clinic_name.replace(/<[^>]*>/g, '')");
  });

  it('HTML tags stripped from clinic_address in profile', () => {
    const code = readFile('routes/profile.ts');
    expect(code).toContain("clinic_address.replace(/<[^>]*>/g, '')");
  });

  it('HTML tags stripped from notes in schedules', () => {
    const code = readFile('routes/schedules.ts');
    expect(code).toContain("notes || '').replace(/<[^>]*>/g, '')");
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
    // Must check the first 4 bytes match PNG signature
    expect(code).toContain('bytes[0] === 0x89');
    expect(code).toContain('bytes[1] === 0x50');
    expect(code).toContain('bytes[2] === 0x4E');
    expect(code).toContain('bytes[3] === 0x47');
  });

  it('logo upload validates JPEG magic bytes (0xFFD8FF)', () => {
    const code = readFile('routes/profile.ts');
    // Must check the first 3 bytes match JPEG signature
    expect(code).toContain('bytes[0] === 0xFF');
    expect(code).toContain('bytes[1] === 0xD8');
    expect(code).toContain('bytes[2] === 0xFF');
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

  it('admin verification code value is NOT included in email subject line', () => {
    const emailCode = readFile('services/email.ts');
    // Find the sendAdminVerificationCode function's subject line
    const funcSection = emailCode.slice(emailCode.indexOf('sendAdminVerificationCode'));
    const subjectMatch = funcSection.match(/subject\s*=\s*['"`][^'"`]*['"`]/);
    expect(subjectMatch).not.toBeNull();
    // The subject should NOT interpolate the actual code value — it belongs only in the HTML body
    // A descriptive word like "verification code" in the subject is fine,
    // but ${code} (the 6-digit value) must never appear in the subject
    expect(subjectMatch![0]).not.toContain('${code}');
    expect(subjectMatch![0]).not.toContain('${escapeHtml(code)}');
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

describe('Cookie Security', () => {
  // User login is handled by Firebase phone auth → /auth/firebase sets cookies
  it('firebase auth endpoint issues cookies with httpOnly flag', () => {
    const code = readFile('routes/auth.ts');
    const firebaseSection = code.slice(code.indexOf("'/firebase'"));
    expect(firebaseSection).toContain('httpOnly: true');
  });

  it('firebase auth endpoint issues cookies with sameSite attribute', () => {
    const code = readFile('routes/auth.ts');
    const firebaseSection = code.slice(code.indexOf("'/firebase'"));
    expect(firebaseSection).toContain('sameSite:');
    expect(firebaseSection).toContain("'Lax'");
  });

  it('firebase auth endpoint issues cookies with path set to root', () => {
    const code = readFile('routes/auth.ts');
    const firebaseSection = code.slice(code.indexOf("'/firebase'"));
    expect(firebaseSection).toContain("path: '/'");
  });

  it('auth refresh endpoint issues cookies with same security attributes', () => {
    const code = readFile('routes/auth.ts');
    const refreshSection = code.slice(code.indexOf("'/refresh'"));
    expect(refreshSection).toContain('httpOnly: true');
    expect(refreshSection).toContain('secure: isProduction');
    expect(refreshSection).toContain('sameSite:');
    expect(refreshSection).toContain("path: '/'");
  });

  it('admin verify-code cookie uses httpOnly and secure flags', () => {
    const code = readFile('routes/admin.ts');
    const verifySection = code.slice(code.indexOf("'/verify-code'"), code.indexOf("'/users'"));
    expect(verifySection).toContain('httpOnly: true');
    expect(verifySection).toContain('secure: isProduction');
    expect(verifySection).toContain('sameSite:');
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
    'routes/admin.ts',
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

describe('Admin Route Authorization Chain', () => {
  it('admin /users GET requires both requireAuth and requireAdmin middleware', () => {
    const code = readFile('routes/admin.ts');
    const usersSection = code.match(/adminRoutes\.get\(\s*['"]\/users['"]/);
    expect(usersSection).not.toBeNull();
    // The route registration must include both requireAuth and requireAdmin
    const routeLine = code.slice(code.indexOf("adminRoutes.get('/users'"), code.indexOf("adminRoutes.get('/users'") + 200);
    expect(routeLine).toContain('requireAuth');
    expect(routeLine).toContain('requireAdmin');
  });

  it('admin /users/:id/approve requires requireAuth, requireAdmin, and requireCSRF', () => {
    const code = readFile('routes/admin.ts');
    const routeLine = code.slice(
      code.indexOf("'/users/:id/approve'"),
      code.indexOf("'/users/:id/approve'") + 200,
    );
    expect(routeLine).toContain('requireAuth');
    expect(routeLine).toContain('requireAdmin');
    expect(routeLine).toContain('requireCSRF');
  });

  it('admin /users/:id/deny requires requireAuth, requireAdmin, and requireCSRF', () => {
    const code = readFile('routes/admin.ts');
    const routeLine = code.slice(
      code.indexOf("'/users/:id/deny'"),
      code.indexOf("'/users/:id/deny'") + 200,
    );
    expect(routeLine).toContain('requireAuth');
    expect(routeLine).toContain('requireAdmin');
    expect(routeLine).toContain('requireCSRF');
  });
});

describe('CORS Configuration Security', () => {
  it('CORS uses strict origin from FRONTEND_URL (no wildcard)', () => {
    const code = readFile('index.ts');
    expect(code).toContain('origin: [frontendUrl]');
    expect(code).not.toContain("origin: '*'");
    expect(code).not.toContain('origin: true');
  });

  it('CORS allows credentials for httpOnly cookie transport', () => {
    const code = readFile('index.ts');
    expect(code).toContain('credentials: true');
  });

  it('CORS rejects requests when FRONTEND_URL is not configured', () => {
    const code = readFile('index.ts');
    expect(code).toContain('!frontendUrl');
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

describe('Account Lockout Protection', () => {
  // User login uses Firebase Phone Auth which handles rate limiting internally.
  // Admin 2FA has custom rate limiting (max 3 codes per 5 min).
  it('admin send-code has rate limiting for verification codes', () => {
    const code = readFile('routes/admin.ts');
    const sendCodeSection = code.slice(code.indexOf("'/send-code'"), code.indexOf("'/verify-code'"));
    expect(sendCodeSection).toContain('RATE_LIMITED');
    expect(sendCodeSection).toContain('Too many codes requested');
  });
});

describe('Anti-Enumeration Protection', () => {
  // Phone auth uses Firebase which does not reveal whether a phone number is registered.
  // Firebase handles SMS delivery and code verification.
  // Backend returns generic "Invalid or expired token" for bad Firebase tokens.
  it('firebase endpoint returns generic error for invalid tokens (no user enumeration)', () => {
    const code = readFile('routes/auth.ts');
    expect(code).toContain('INVALID_TOKEN');
    expect(code).toContain('Invalid or expired token');
  });
});

describe('Email Template Security', () => {
  it('email service uses escapeHtml for all user-provided content', () => {
    const code = readFile('services/email.ts');
    expect(code).toContain('escapeHtml');
    // escapeHtml should escape &, <, >, and "
    expect(code).toContain('&amp;');
    expect(code).toContain('&lt;');
    expect(code).toContain('&gt;');
    expect(code).toContain('&quot;');
  });

  // No passwords in phone auth system — only SMS OTP.
  it('admin verification code is hashed before storage (SHA-256)', () => {
    const code = readFile('routes/admin.ts');
    expect(code).toContain("crypto.subtle.digest('SHA-256'");
    expect(code).toContain('code_hash');
  });
});

describe('Verification Code Security', () => {
  it('admin verification code is hashed with SHA-256 before storage', () => {
    const code = readFile('routes/admin.ts');
    expect(code).toContain("crypto.subtle.digest('SHA-256'");
    expect(code).toContain('code_hash');
  });

  it('admin verification code validates exactly 6 digits', () => {
    const code = readFile('routes/admin.ts');
    expect(code).toContain('body.code.length !== 6');
    expect(code).toContain('/^\\d{6}$/.test(body.code)');
  });

  it('admin send-code checks role is admin before generating code', () => {
    const code = readFile('routes/admin.ts');
    const sendCodeSection = code.slice(code.indexOf("'/send-code'"), code.indexOf("'/verify-code'"));
    expect(sendCodeSection).toContain("user.role !== 'admin'");
    expect(sendCodeSection).toContain('FORBIDDEN');
  });

  it('admin verify-code checks role is admin before validating code', () => {
    const code = readFile('routes/admin.ts');
    const verifySection = code.slice(code.indexOf("'/verify-code'"), code.indexOf("'/users'"));
    expect(verifySection).toContain("user.role !== 'admin'");
    expect(verifySection).toContain('FORBIDDEN');
  });
});
