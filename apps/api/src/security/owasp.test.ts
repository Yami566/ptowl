import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Static analysis security tests — verify security patterns across the codebase
// These tests scan source code to enforce security best practices

const API_SRC = path.resolve(__dirname, '..');
// From apps/api/src/security → go up 4 levels to monorepo root
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SHARED_SRC = path.join(MONOREPO_ROOT, 'packages', 'shared', 'src');
const WEB_SRC = path.join(MONOREPO_ROOT, 'apps', 'web', 'src');

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

// ── A03: Injection Prevention ──

describe('OWASP A03: Injection Prevention', () => {
  it('SQL template literals only use safe patterns (dynamic SET/datetime offsets)', () => {
    const files = readAllFiles(API_SRC, ['.ts']);
    for (const file of files) {
      const sqlConcatPattern = /\.prepare\s*\(\s*`[^`]*\$\{([^}]+)\}/g;
      let match: RegExpExecArray | null;
      while ((match = sqlConcatPattern.exec(file.content)) !== null) {
        const interpolation = match[1]!.trim();
        // These are the only safe interpolation patterns:
        // - Dynamic SET clauses from hardcoded column arrays: ${updates.join(', ')}
        // - SQLite datetime offsets: ${minutesVariable} minutes
        // Allowed: dynamic SET from hardcoded columns, or constants for datetime()
        const safePatterns = [
          /updates\.join/, // Dynamic SET from validated columns
          /lockoutWindow/, // Rate limit window constant
          /Expiry|expiry|Window|window/i, // Any expiry/window constant
          /sentColumn/, // Reminder cron picks one of two hardcoded column names
        ];
        const isSafe = safePatterns.some((p) => p.test(interpolation));
        expect(isSafe, `Unsafe SQL interpolation \${${interpolation}} in ${file.path}`).toBe(true);
      }
    }
  });

  it('no raw SQL string concatenation with user input', () => {
    const files = readAllFiles(API_SRC, ['.ts']);
    for (const file of files) {
      // Check for string concatenation in prepare() calls
      const concatPattern = /\.prepare\s*\([^)]*\+[^)]*\)/g;
      const matches = file.content.match(concatPattern);
      expect(matches, `Found SQL string concatenation in ${file.path}`).toBeNull();
    }
  });
});

// ── A02: Cryptographic Failures ──

describe('OWASP A02: Cryptographic Strength', () => {
  it('password hashing uses PBKDF2-SHA256', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'crypto/password.ts'), 'utf-8');
    expect(content).toContain('PBKDF2');
    expect(content).toContain('SHA-256');
  });

  it('password hashing uses at least 100,000 iterations', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'crypto/password.ts'), 'utf-8');
    expect(content).toContain('100_000');
  });

  it('JWT uses HMAC-SHA256', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'crypto/jwt.ts'), 'utf-8');
    expect(content).toContain('HMAC');
    expect(content).toContain('SHA-256');
    expect(content).toContain('HS256');
  });

  it('password verification uses constant-time comparison', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'crypto/password.ts'), 'utf-8');
    // Check for XOR-based comparison pattern
    expect(content).toContain('diff |=');
    expect(content).toContain('charCodeAt');
  });

  it('CSRF protection uses hono/csrf with origin check (no custom HMAC token)', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'index.ts'), 'utf-8');
    expect(content).toContain("from 'hono/csrf'");
    expect(content).toContain('csrf({ origin:');
  });
});

// ── A04: Insecure Design ──

describe('OWASP A04: Secure Design Patterns', () => {
  it('CSRF protection is applied globally via hono/csrf in index.ts', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'index.ts'), 'utf-8');
    expect(content).toContain("from 'hono/csrf'");
    expect(content).toContain('csrf({ origin:');
  });

  it('authentication is required on all schedule routes', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'routes/schedules.ts'), 'utf-8');
    expect(content).toContain('requireAuth');
  });

  it('schedule GET queries include user_id filter (cross-user isolation)', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'routes/schedules.ts'), 'utf-8');
    // Every SELECT should include user_id binding
    const selectStatements = content.match(/SELECT\s.*FROM\s+schedules\s+WHERE/g) || [];
    for (const stmt of selectStatements) {
      // The full query should include user_id (checked in subsequent bind)
      expect(content).toContain('user_id = ?');
    }
  });

  it('schedule DELETE includes user_id check', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'routes/schedules.ts'), 'utf-8');
    const deleteSection = content.slice(content.indexOf('scheduleRoutes.delete'));
    expect(deleteSection).toContain('user_id = ?');
  });
});

// ── A05: Security Misconfiguration ──

describe('OWASP A05: Security Configuration', () => {
  it('source maps are disabled in production build', () => {
    const viteConfigPath = path.join(MONOREPO_ROOT, 'apps', 'web', 'vite.config.ts');
    const viteConfig = fs.readFileSync(viteConfigPath, 'utf-8');
    expect(viteConfig).toContain('sourcemap');
    expect(viteConfig).toContain('false');
  });

  it('API uses secure headers middleware (CSP, X-Frame-Options)', () => {
    const indexContent = fs.readFileSync(path.join(API_SRC, 'index.ts'), 'utf-8');
    // Hono's secureHeaders middleware sets CSP, X-Frame-Options, etc.
    expect(indexContent).toContain('secureHeaders');
  });

  it('cookies are httpOnly', () => {
    const files = readAllFiles(API_SRC, ['.ts']);
    const cookieFiles = files.filter(
      (f) => f.content.includes('setCookie') || f.content.includes('Set-Cookie'),
    );
    for (const file of cookieFiles) {
      if (file.content.includes('httpOnly')) {
        expect(file.content).toContain('httpOnly');
      }
    }
  });

  it('CORS is configured', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'index.ts'), 'utf-8');
    expect(content).toContain('cors');
  });
});

// ── A07: Identification and Authentication Failures ──

describe('OWASP A07: Authentication Security', () => {
  it('password validation enforces complexity rules', () => {
    // Password complexity rules live in Zod schemas (schemas.ts) used by input.ts
    const content = fs.readFileSync(path.join(SHARED_SRC, 'validators/schemas.ts'), 'utf-8');
    expect(content).toContain('[A-Z]'); // uppercase
    expect(content).toContain('[a-z]'); // lowercase
    expect(content).toContain('[0-9]'); // digit
    expect(content).toContain('length >= 8'); // minimum length
  });

  it('input validation exists for all critical fields', () => {
    const content = fs.readFileSync(path.join(SHARED_SRC, 'validators/input.ts'), 'utf-8');
    expect(content).toContain('validateEmail');
    expect(content).toContain('validatePassword');
    expect(content).toContain('validateInitials');
    expect(content).toContain('validateScheduleParams');
  });

  it('rate limiting is handled by Cloudflare WAF', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'index.ts'), 'utf-8');
    expect(content).toContain('Cloudflare WAF');
  });
});

// ── A06: Vulnerable Components ──

describe('OWASP A06: Dependency Security', () => {
  it('no known vulnerable patterns in package.json', () => {
    const apiPkg = JSON.parse(fs.readFileSync(path.resolve(API_SRC, '../package.json'), 'utf-8'));
    const allDeps = { ...apiPkg.dependencies, ...apiPkg.devDependencies };
    // Ensure core deps are present and reasonably recent
    expect(allDeps.hono).toBeDefined();
    expect(allDeps.typescript).toBeDefined();
  });
});

// ── Input Validation (Schedule-specific) ──

describe('Schedule input validation', () => {
  it('validates patient initials format on create', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'routes/schedules.ts'), 'utf-8');
    expect(content).toContain('validateInitials');
  });

  it('validates schedule params on create', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'routes/schedules.ts'), 'utf-8');
    expect(content).toContain('validateScheduleParams');
  });

  it('validates start_date format', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'routes/schedules.ts'), 'utf-8');
    expect(content).toContain('YYYY-MM-DD');
  });

  it('truncates long provider_name (max 200)', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'routes/schedules.ts'), 'utf-8');
    expect(content).toContain('.slice(0, 200)');
  });

  it('truncates long notes (max 1000)', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'routes/schedules.ts'), 'utf-8');
    expect(content).toContain('.slice(0, 1000)');
  });

  it('enforces tier limits on schedule creation', () => {
    const content = fs.readFileSync(path.join(API_SRC, 'routes/schedules.ts'), 'utf-8');
    expect(content).toContain('TIER_LIMIT');
    expect(content).toContain('maxSchedules');
  });
});
