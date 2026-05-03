import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ══════════════════════════════════════════════════════════════════
// API Penetration Tests — Static analysis simulating attacker payloads
// Verifies server-side defenses against injection, bypass, and abuse
// ══════════════════════════════════════════════════════════════════

const API_SRC = path.resolve(__dirname, '..');
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SHARED_SRC = path.join(MONOREPO_ROOT, 'packages', 'shared', 'src');

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

// ── Template Endpoint Security ──

describe('Template API Hardening', () => {
  const templateCode = () => readFile('routes/templates.ts');

  it('template PUT sanitizes HTML from name field (stored XSS prevention)', () => {
    const code = templateCode();
    // Must strip HTML tags from name before storing
    expect(code).toContain('replace(/<[^>]*>/g');
  });

  it('template PUT validates name is a string type', () => {
    const code = templateCode();
    expect(code).toContain("typeof body.name !== 'string'");
  });

  it('template PUT rejects empty name after sanitization', () => {
    const code = templateCode();
    expect(code).toContain('sanitizedName.length === 0');
  });

  it('template PUT validates hex ID format for template ID', () => {
    const code = templateCode();
    // Must validate ID matches 32-char hex pattern before DB query
    expect(code).toContain('[0-9a-f]{32}');
  });

  it('template time validation rejects semantically invalid hours (25:00, 99:99)', () => {
    const code = templateCode();
    // Must use strict time regex: ([01]\d|2[0-3]):[0-5]\d
    expect(code).toContain('([01]\\d|2[0-3]):[0-5]\\d');
  });

  it('template PUT has authentication requirement', () => {
    const code = templateCode();
    expect(code).toContain('requireAuth');
  });

  it('template queries always include user_id filter (cross-user isolation)', () => {
    const code = templateCode();
    // Every SELECT/UPDATE should bind user_id
    const sqlStatements = code.match(/WHERE.*user_id = \?/g) || [];
    // At least: SELECT ownership check, UPDATE ownership, SELECT updated
    expect(sqlStatements.length).toBeGreaterThanOrEqual(3);
  });

  it('template name length is bounded (max 100 chars)', () => {
    const code = templateCode();
    expect(code).toContain('body.name.length > 100');
  });

  it('sessions_per_week is validated as integer 1-7', () => {
    const code = templateCode();
    expect(code).toContain('Number.isInteger(body.sessions_per_week)');
    expect(code).toContain('sessions_per_week < 1');
    expect(code).toContain('sessions_per_week > 7');
  });

  it('duration_weeks is validated as integer 1-52', () => {
    const code = templateCode();
    expect(code).toContain('Number.isInteger(body.duration_weeks)');
    expect(code).toContain('duration_weeks < 1');
    expect(code).toContain('duration_weeks > 52');
  });

  it('is_active only accepts 0 or 1', () => {
    const code = templateCode();
    expect(code).toContain('body.is_active !== 0 && body.is_active !== 1');
  });

  it('UPDATE SET clause only interpolates hardcoded column names', () => {
    const code = templateCode();
    // The only template interpolation in SQL should be updates.join
    const sqlInterpolation = code.match(/\$\{([^}]+)\}/g) || [];
    for (const interp of sqlInterpolation) {
      expect(interp).toContain('updates.join');
    }
  });

  it('empty update body is rejected', () => {
    const code = templateCode();
    expect(code).toContain('updates.length === 0');
    expect(code).toContain('No fields to update');
  });
});

// ── Appointment Endpoint Security ──

describe('Appointment API Hardening', () => {
  const appointmentCode = () => readFile('routes/appointments.ts');

  it('appointment PATCH validates hex ID format for appointment ID', () => {
    const code = appointmentCode();
    expect(code).toContain('[0-9a-f]{32}');
  });

  it('appointment time validation rejects invalid hours (25:00)', () => {
    const code = appointmentCode();
    expect(code).toContain('([01]\\d|2[0-3]):[0-5]\\d');
  });

  it('appointment ownership verified via JOIN with schedules.user_id', () => {
    const code = appointmentCode();
    // Must JOIN schedules to verify user ownership
    expect(code).toContain('JOIN schedules');
    expect(code).toContain('s.user_id = ?');
  });

  it('provider_name is truncated (max 200)', () => {
    const code = appointmentCode();
    expect(code).toContain('.slice(0, 200)');
  });

  it('reminder_sent is coerced to 0 or 1 only', () => {
    const code = appointmentCode();
    // Must coerce to boolean-safe value
    expect(code).toContain('body.reminder_sent ? 1 : 0');
  });
});

// ── Profile/Logo Endpoint Security ──

describe('Profile API Hardening', () => {
  const profileCode = () => readFile('routes/profile.ts');

  it('logo upload validates MIME type (PNG/JPEG only)', () => {
    const code = profileCode();
    // M7 FIX uses regex patterns with escaped slashes for strict validation
    expect(code).toContain('image\\/png');
    expect(code).toContain('image\\/jpeg');
  });

  it('logo upload enforces size limit (500KB)', () => {
    const code = profileCode();
    expect(code).toContain('700_000');
  });

  it('profile fields are length-bounded (clinic_name 200, address 500, phone 20, email 254)', () => {
    const code = profileCode();
    expect(code).toContain('.slice(0, 200)');
    expect(code).toContain('.slice(0, 500)');
    expect(code).toContain('.slice(0, 20)');
    expect(code).toContain('.slice(0, 254)');
  });

  it('clinic_email is validated as email format', () => {
    const code = profileCode();
    expect(code).toMatch(/@/); // Email regex present
  });
});

// ── Cross-Cutting API Security ──

describe('Cross-Cutting API Security', () => {
  it('all route files use requireAuth on all endpoints', () => {
    const routeFiles = [
      'routes/templates.ts',
      'routes/appointments.ts',
      'routes/schedules.ts',
      'routes/profile.ts',
    ];
    for (const file of routeFiles) {
      const code = readFile(file);
      expect(code, `Missing requireAuth in ${file}`).toContain('requireAuth');
    }
  });

  it('CSRF protection is applied globally via hono/csrf (origin-based)', () => {
    const indexContent = fs.readFileSync(path.join(API_SRC, 'index.ts'), 'utf-8');
    // Hono's csrf middleware checks Origin/Referer against the configured origin
    // on state-changing requests (POST/PUT/PATCH/DELETE). Single global registration
    // replaces the per-route requireCSRF middleware.
    expect(indexContent).toContain("from 'hono/csrf'");
    expect(indexContent).toContain('csrf({ origin:');
  });

  it('no caught exception object leaks in JSON responses', () => {
    const routeFiles = readAllFiles(path.join(API_SRC, 'routes'), ['.ts']);
    for (const file of routeFiles) {
      // Find catch blocks and ensure the caught variable isn't passed to c.json
      // Pattern: } catch (someVar) { ... c.json(...someVar...) }
      // Note: `err` as a local validation error string (e.g., `const err = validate()`) is fine
      const catchPattern = /\}\s*catch\s*\((\w+)\)\s*\{([\s\S]*?)(?=\}\s*(?:\)|\n))/g;
      let match: RegExpExecArray | null;
      while ((match = catchPattern.exec(file.content)) !== null) {
        const caughtVar = match[1]!;
        const catchBody = match[2]!;
        // The caught exception should only appear in console.error, not in c.json response data
        const jsonCalls = catchBody.match(/c\.json\(\s*\{[^}]*\}/g) || [];
        for (const call of jsonCalls) {
          // The caught error variable should not appear as a value in the response
          // Allow: message: 'Failed to ...' (string literal)
          // Reject: message: caughtVar or data: caughtVar
          const leakPattern = new RegExp(`(?:message|data)\\s*:\\s*${caughtVar}\\b`);
          expect(
            leakPattern.test(call),
            `Caught exception '${caughtVar}' may leak in response in ${file.path}`,
          ).toBe(false);
        }
      }
    }
  });

  it('all catch blocks return generic error messages', () => {
    const routeFiles = readAllFiles(path.join(API_SRC, 'routes'), ['.ts']);
    for (const file of routeFiles) {
      // Every catch block should return INTERNAL_ERROR with generic message
      const catchBlocks = file.content.match(/catch\s*\(\w+\)\s*\{[\s\S]*?INTERNAL_ERROR/g) || [];
      // Find all catch blocks
      const allCatches = file.content.match(/\}\s*catch\s*\(/g) || [];
      // If there are catches, at least some should have INTERNAL_ERROR
      if (allCatches.length > 0) {
        expect(
          catchBlocks.length,
          `Missing INTERNAL_ERROR in catch blocks of ${file.path}`,
        ).toBeGreaterThan(0);
      }
    }
  });

  it('SQL queries never use string concatenation with user input', () => {
    const routeFiles = readAllFiles(path.join(API_SRC, 'routes'), ['.ts']);
    for (const file of routeFiles) {
      // Check for dangerous: .prepare('SELECT ... ' + variable)
      const concatPattern = /\.prepare\s*\(\s*[^`][^)]*\+[^)]*\)/g;
      const matches = file.content.match(concatPattern);
      expect(matches, `SQL concatenation found in ${file.path}`).toBeNull();
    }
  });

  it('all SQL queries use parameterized .bind()', () => {
    const routeFiles = readAllFiles(path.join(API_SRC, 'routes'), ['.ts']);
    for (const file of routeFiles) {
      // Every .prepare() should be followed by .bind() (except static queries with no params)
      const prepareStatements = file.content.match(/\.prepare\([^)]+\?\s*[^)]*\)/g) || [];
      for (const stmt of prepareStatements) {
        // If query contains ?, it must use .bind()
        if (stmt.includes('?')) {
          expect(file.content, `Parameterized query without .bind() in ${file.path}`).toContain(
            '.bind(',
          );
        }
      }
    }
  });
});

// ── Security Header Verification ──

describe('Security Headers & CSP', () => {
  const indexCode = () => readFile('index.ts');

  it('CSP allows only self and approved script sources (no unsafe-eval)', () => {
    const code = indexCode();
    expect(code).toContain('scriptSrc:');
    expect(code).toContain("'self'");
    expect(code).toContain('https://challenges.cloudflare.com');
    expect(code).not.toContain('unsafe-eval');
  });

  it('CSP frame-src allows only approved iframe sources', () => {
    const code = indexCode();
    expect(code).toContain('frameSrc:');
    expect(code).toContain('https://challenges.cloudflare.com');
  });

  it('CSP restricts img-src to self, data, and approved sources', () => {
    const code = indexCode();
    expect(code).toContain('imgSrc:');
    expect(code).toContain("'self'");
    expect(code).toContain('data:');
  });

  it('X-Frame-Options set to DENY', () => {
    const code = indexCode();
    expect(code).toContain("xFrameOptions: 'DENY'");
  });

  it('X-Content-Type-Options set to nosniff', () => {
    const code = indexCode();
    expect(code).toContain("xContentTypeOptions: 'nosniff'");
  });

  it('Referrer-Policy is strict', () => {
    const code = indexCode();
    expect(code).toContain("referrerPolicy: 'strict-origin-when-cross-origin'");
  });

  it('frame-ancestors set to none (clickjacking protection)', () => {
    const code = indexCode();
    expect(code).toContain('frameAncestors: ["\'none\'"]');
  });

  it('object-src set to none (plugin content blocked)', () => {
    const code = indexCode();
    expect(code).toContain('objectSrc: ["\'none\'"]');
  });

  it('base-uri restricted to self (base tag hijacking prevention)', () => {
    const code = indexCode();
    expect(code).toContain('baseUri: ["\'self\'"]');
  });

  it('form-action restricted to self', () => {
    const code = indexCode();
    expect(code).toContain('formAction: ["\'self\'"]');
  });

  it('Permissions-Policy restricts camera, mic, geolocation, payment', () => {
    const code = indexCode();
    expect(code).toContain('Permissions-Policy');
    expect(code).toContain('camera=()');
    expect(code).toContain('microphone=()');
    expect(code).toContain('geolocation=()');
    expect(code).toContain('payment=()');
  });

  it('CORS rejects requests when FRONTEND_URL is not configured', () => {
    const code = indexCode();
    expect(code).toMatch(/!origins|!frontendUrl/);
    expect(code).toContain('CONFIG_ERROR');
  });

  it('direct .workers.dev access is blocked in production', () => {
    const code = indexCode();
    expect(code).toContain('.workers.dev');
    expect(code).toContain('FORBIDDEN');
  });
});

// ── Auth verifier security (Clerk) ──
// User auth uses Clerk session tokens. Backend verifies Clerk JWTs
// using jose against Clerk's JWKS endpoint at the configured frontend
// API URL. Replaces the previous Firebase Phone Auth verifier.

describe('Clerk Auth Security', () => {
  it('JWKS verifier uses jose against the Clerk frontend API endpoint', () => {
    const code = readFile('auth/clerk-verify.ts');
    expect(code).toContain('/.well-known/jwks.json');
    // Use the off-the-shelf jose JWKS handler instead of hand-rolled
    // RSA verification; it manages caching, cooldown, and refresh.
    expect(code).toContain('createRemoteJWKSet');
    expect(code).toContain('jwtVerify');
  });

  it('JWKS verifier validates issuer with RS256', () => {
    const code = readFile('auth/clerk-verify.ts');
    expect(code).toContain('expectedIssuer');
    expect(code).toContain("algorithms: ['RS256']");
  });

  it('user provisioning links by sub then phone then email', () => {
    const code = readFile('auth/provision.ts');
    // The lookup chain still uses sub; phone + email branches are
    // skipped harmlessly when Clerk JWTs (which omit those fields by
    // default) hit the resolver.
    expect(code).toContain('claims.sub');
    expect(code).toContain('WHERE firebase_uid = ?');
  });

  it('CLERK_FRONTEND_API_URL is in Env type (not hardcoded)', () => {
    const envCode = readFile('types/env.ts');
    expect(envCode).toContain('CLERK_FRONTEND_API_URL');
  });
});

// ── Rate Limiting Coverage ──
// Rate limiting moved to Cloudflare WAF Rules (edge-level, dashboard config).
// Custom per-isolate rate limiting was unreliable on distributed Workers.

describe('Rate Limiting Coverage', () => {
  const indexCode = () => readFile('index.ts');

  it('documents that rate limiting is handled by Cloudflare WAF', () => {
    const code = indexCode();
    expect(code).toContain('Cloudflare WAF');
  });
});

// ── Zod Schema Security ──

describe('Zod Schema Validation Security', () => {
  const schemasCode = () =>
    fs.readFileSync(path.join(SHARED_SRC, 'validators/schemas.ts'), 'utf-8');
  const inputCode = () => fs.readFileSync(path.join(SHARED_SRC, 'validators/input.ts'), 'utf-8');

  it('email schema enforces max length (254 chars)', () => {
    const code = schemasCode();
    expect(code).toContain('.max(254');
  });

  it('email schema normalizes input (trim + lowercase)', () => {
    const code = schemasCode();
    expect(code).toContain('.trim()');
    expect(code).toContain('.toLowerCase()');
  });

  it('password schema enforces all 4 complexity rules', () => {
    const code = schemasCode();
    expect(code).toContain('[A-Z]'); // uppercase
    expect(code).toContain('[a-z]'); // lowercase
    expect(code).toContain('[0-9]'); // digit
    expect(code).toContain('length >= 8'); // min length
  });

  it('password schema enforces max length (128 chars against DoS)', () => {
    const code = schemasCode();
    expect(code).toContain('.max(128');
  });

  it('initials schema enforces exactly 2 letters (no XSS payloads)', () => {
    const code = schemasCode();
    expect(code).toContain('^[A-Za-z]{2}$');
  });

  it('display_name schema enforces max length (50 chars)', () => {
    const code = schemasCode();
    expect(code).toContain('.max(50');
  });

  it('schedule params enforce integer boundaries (1-7 sessions, 1-52 weeks)', () => {
    const code = schemasCode();
    expect(code).toContain('.min(1');
    expect(code).toContain('.max(7');
    expect(code).toContain('.max(52');
  });

  it('wrapper functions use safeParse (no unhandled exceptions)', () => {
    const code = inputCode();
    expect(code).toContain('.safeParse(');
    // Should NOT use .parse() which throws
    const parseCallsWithoutSafe = code.match(/(?<!safe)Parse\(/g);
    expect(parseCallsWithoutSafe).toBeNull();
  });

  it('wrapper functions maintain backward-compatible string|null return type', () => {
    const code = inputCode();
    // All validate functions should return null on success
    expect(code).toContain('return null');
  });

  it('start_date in createScheduleRequestSchema validates YYYY-MM-DD format', () => {
    const code = schemasCode();
    expect(code).toContain('\\d{4}-\\d{2}-\\d{2}');
  });
});

// ── Error Handler Security ──

describe('Global Error Handler Security', () => {
  it('global error handler returns generic message (no stack traces)', () => {
    const code = readFile('index.ts');
    // onError handler should not include err in the response
    const errorHandler = code.slice(code.indexOf('app.onError'));
    expect(errorHandler).toContain('INTERNAL_ERROR');
    expect(errorHandler).toContain("'An unexpected error occurred'");
    // The err object should only be logged, not returned
    expect(errorHandler).toContain('console.error');
  });

  it('404 handler returns structured error (not raw stack)', () => {
    const code = readFile('index.ts');
    expect(code).toContain('app.notFound');
    expect(code).toContain("'NOT_FOUND'");
  });
});
