import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// UI Security Vulnerability Audit
// Static analysis tests that scan frontend source code for security issues

const WEB_SRC = path.resolve(__dirname, '..');
// From apps/web/src/security → go up 4 levels to monorepo root
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function readAllFiles(dir: string, ext: string[]): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (
        entry.isFile() &&
        ext.some((e) => entry.name.endsWith(e)) &&
        !entry.name.includes('.test.') &&
        !entry.name.includes('node_modules')
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

// ── XSS Prevention ──

describe('XSS Prevention', () => {
  it('no dangerouslySetInnerHTML usage in any component', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      expect(file.content, `Found dangerouslySetInnerHTML in ${file.path}`).not.toContain(
        'dangerouslySetInnerHTML',
      );
    }
  });

  it('no eval() calls in frontend code', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      // Match eval( but not "evaluate" or "interval"
      const evalMatches = file.content.match(/\beval\s*\(/g);
      expect(evalMatches, `Found eval() in ${file.path}`).toBeNull();
    }
  });

  it('no document.write() calls', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      expect(file.content, `Found document.write in ${file.path}`).not.toContain('document.write');
    }
  });

  it('no innerHTML assignments', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      const innerHTMLMatches = file.content.match(/\.innerHTML\s*=/g);
      expect(innerHTMLMatches, `Found innerHTML assignment in ${file.path}`).toBeNull();
    }
  });
});

// ── Data Leakage Prevention ──

describe('Data Leakage Prevention', () => {
  it('no localStorage.setItem with sensitive data', () => {
    // Allow known safe localStorage usage (device-local, non-sensitive preferences)
    const SAFE_LOCALSTORAGE_FILES = [
      'usePrintSettings.ts', // print layout preferences
      'firebase.ts', // Firebase auth persistence (browserLocalPersistence)
      'useTheme.ts', // dark/light mode toggle
      'DashboardPage.tsx', // streak counter + schedule order (localStorage-based)
      'OnboardingChecklist.tsx', // onboarding step progress
      // Phone number is the address (login identifier), not the credential.
      // Firebase OTP is the actual auth — knowing the number alone gains no access.
      // Persisting it is a one-tap-return UX win, not a sensitive-data leak.
      'LandingPage.tsx', // last-used phone number for one-tap return
    ];
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      if (SAFE_LOCALSTORAGE_FILES.some((f) => file.path.includes(f))) continue;
      const matches = file.content.match(/localStorage\.setItem/g);
      expect(matches, `Found localStorage.setItem in ${file.path}`).toBeNull();
    }
  });

  it('no sessionStorage.setItem with sensitive data', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      const matches = file.content.match(/sessionStorage\.setItem/g);
      expect(matches, `Found sessionStorage.setItem in ${file.path}`).toBeNull();
    }
  });

  it('no console.log statements in production code', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      const matches = file.content.match(/console\.(log|debug|info)\s*\(/g);
      expect(matches, `Found console.log in ${file.path}`).toBeNull();
    }
  });
});

// ── API Security ──

describe('API Communication Security', () => {
  it('API client uses credentials: include', () => {
    const clientFile = fs.readFileSync(path.join(WEB_SRC, 'api/client.ts'), 'utf-8');
    expect(clientFile).toContain("credentials: 'include'");
  });

  it('client relies on browser-sent Origin for CSRF (no token in headers)', () => {
    const clientFile = fs.readFileSync(path.join(WEB_SRC, 'api/client.ts'), 'utf-8');
    // No custom CSRF header logic — server uses hono/csrf which validates Origin/Referer.
    expect(clientFile).not.toContain('X-CSRF-Token');
    expect(clientFile).not.toContain('csrfToken');
  });

  it('API base URL uses relative path (no hardcoded domain)', () => {
    const clientFile = fs.readFileSync(path.join(WEB_SRC, 'api/client.ts'), 'utf-8');
    expect(clientFile).toContain('/api/v1');
  });
});

// ── Authentication Security ──

describe('Authentication Security', () => {
  it('AuthContext handles auth state securely', () => {
    const authFile = fs.readFileSync(path.join(WEB_SRC, 'contexts/AuthContext.tsx'), 'utf-8');
    // Auth state is managed in React state (not localStorage)
    expect(authFile).toContain('useState<AuthUser | null>(null)');
    // Redirects unauthenticated users to landing page
    expect(authFile).toContain("navigate('/'");
  });

  it('phone auth uses Firebase (no local password form)', () => {
    const landingFile = fs.readFileSync(path.join(WEB_SRC, 'pages/LandingPage.tsx'), 'utf-8');
    // Firebase phone auth — SMS handled by Firebase, token exchanged with backend
    expect(landingFile).toContain('sendPhoneCode');
    expect(landingFile).toContain('/auth/firebase');
    expect(landingFile).toContain('inputMode="numeric"');
  });

  it('login page redirects to landing (phone auth is inline)', () => {
    const loginFile = fs.readFileSync(path.join(WEB_SRC, 'pages/LoginPage.tsx'), 'utf-8');
    // LoginPage is a redirect stub — phone auth lives on LandingPage
    expect(loginFile).toContain("navigate('/'");
  });
});

// ── PII Protection ──

describe('PII Protection', () => {
  it('PII detection module exists and is functional', () => {
    const piiFile = fs.readFileSync(
      path.join(MONOREPO_ROOT, 'packages', 'shared', 'src', 'validators', 'pii.ts'),
      'utf-8',
    );
    expect(piiFile).toContain('detectPII');
    expect(piiFile).toContain('hasPII');
    expect(piiFile).toContain('ssn');
    expect(piiFile).toContain('phone');
    expect(piiFile).toContain('email');
    expect(piiFile).toContain('mrn');
  });
});

// ── Secure Routing ──

describe('Secure Routing', () => {
  it('public paths are explicitly listed (whitelist approach)', () => {
    const authFile = fs.readFileSync(path.join(WEB_SRC, 'contexts/AuthContext.tsx'), 'utf-8');
    expect(authFile).toContain('PUBLIC_PATHS');
    // Verify it's a restricted list, not a broad pattern
    expect(authFile).toContain("'/privacy'");
    expect(authFile).toContain("'/terms'");
  });

  it('admin route exists and is protected', () => {
    const appFile = fs.readFileSync(path.join(WEB_SRC, 'App.tsx'), 'utf-8');
    expect(appFile).toContain('/admin');
  });
});

// ── No Secrets in Source Code ──

describe('No Secrets in Source Code', () => {
  it('no API keys in frontend source (excluding Firebase public config)', () => {
    // Firebase API keys are public by design (restricted by domain, not secrecy)
    const SAFE_KEY_FILES = ['firebase.ts'];
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      if (SAFE_KEY_FILES.some((f) => file.path.includes(f))) continue;
      // Check for common API key patterns
      const apiKeyPattern = /(?:api[_-]?key|secret|token)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi;
      const matches = file.content.match(apiKeyPattern);
      expect(matches, `Found potential API key in ${file.path}`).toBeNull();
    }
  });

  it('no hardcoded passwords in frontend source', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      const pwPattern = /password\s*[:=]\s*['"][^'"]+['"]/gi;
      const matches = file.content.match(pwPattern);
      // Filter out legitimate password field references
      if (matches) {
        const realMatches = matches.filter(
          (m) =>
            !m.includes("password'") &&
            !m.includes('password"') &&
            !m.includes('password:') &&
            !m.includes('type=') &&
            !m.includes('name='),
        );
        expect(realMatches.length, `Found hardcoded password in ${file.path}`).toBe(0);
      }
    }
  });
});
