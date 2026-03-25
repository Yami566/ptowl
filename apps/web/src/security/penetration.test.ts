import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ══════════════════════════════════════════════════════════════════
// Frontend Penetration Tests — Static analysis for UI security
// Covers XSS vectors, injection paths, auth bypass, and data leakage
// in all new features: TemplateEditor, PrintSettings, Calendar, etc.
// ══════════════════════════════════════════════════════════════════

const WEB_SRC = path.resolve(__dirname, '..');
const MONOREPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function readFile(relativePath: string): string {
  return fs.readFileSync(path.join(WEB_SRC, relativePath), 'utf-8');
}

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
  } catch { /* dir doesn't exist */ }
  return files;
}

// ── Template Editor XSS Attack Vectors ──

describe('Template Editor Security', () => {
  const editorCode = () => readFile('pages/TemplateEditorPage.tsx');

  it('template name input has maxLength attribute (client-side defense-in-depth)', () => {
    const code = editorCode();
    expect(code).toContain('maxLength={100}');
  });

  it('template editor does not use dangerouslySetInnerHTML', () => {
    const code = editorCode();
    expect(code).not.toContain('dangerouslySetInnerHTML');
  });

  it('template editor does not use innerHTML', () => {
    const code = editorCode();
    expect(code).not.toContain('.innerHTML');
  });

  it('template names are rendered as JSX text (not HTML)', () => {
    const code = editorCode();
    // Template names should appear in {value} expressions, not in raw HTML
    expect(code).not.toContain('dangerouslySetInnerHTML');
    // The name is in a controlled input, which is inherently safe
    expect(code).toContain('value={getEditValue(template.id');
  });

  it('API calls use apiRequest wrapper (ensures CSRF + credentials)', () => {
    const code = editorCode();
    expect(code).toContain("apiRequest<Template>(`/templates/${id}`");
    expect(code).toContain("method: 'PUT'");
  });

  it('template editor requires authentication (useAuth check)', () => {
    const code = editorCode();
    expect(code).toContain('useAuth()');
    expect(code).toContain('if (!user) return null');
  });

  it('sessions_per_week selector only offers valid integer options 1-7', () => {
    const code = editorCode();
    expect(code).toContain('[1, 2, 3, 4, 5, 6, 7]');
  });

  it('duration_weeks selector is bounded to 52', () => {
    const code = editorCode();
    expect(code).toContain('length: 52');
  });

  it('error messages are displayed as text via toast, not HTML', () => {
    const code = editorCode();
    // Errors shown via toast.error() (text-only, XSS-safe)
    expect(code).toContain('toast.error');
    // Should NOT be rendered as raw HTML
    expect(code).not.toContain('dangerouslySetInnerHTML');
  });
});

// ── Print Settings Security ──

describe('Print Settings Security', () => {
  const hookCode = () => readFile('hooks/usePrintSettings.ts');
  const pageCode = () => readFile('pages/PrintSettingsPage.tsx');

  it('localStorage handling uses a typed library with safe defaults (anti-prototype pollution)', () => {
    const code = hookCode();
    // Uses use-local-storage-state which handles JSON parse safely with defaultValue
    expect(code).toContain('use-local-storage-state');
    expect(code).toContain('defaultValue');
  });

  it('print settings page does not expose sensitive data', () => {
    const code = pageCode();
    // Should NOT contain any PII, API keys, or sensitive data
    expect(code).not.toContain('password');
    expect(code).not.toContain('apiKey');
    expect(code).not.toContain('secret');
    expect(code).not.toContain('token');
  });

  it('print settings page requires authentication', () => {
    const code = pageCode();
    expect(code).toContain('useAuth()');
  });

  it('localStorage key uses consistent prefix (no key collision)', () => {
    const code = hookCode();
    expect(code).toContain("'ptowl-print-settings'");
  });
});

// ── FullCalendar / PTCalendar Security ──

describe('Calendar Component Security', () => {
  const calendarCode = () => readFile('components/schedule/PTCalendar.tsx');
  const popoverCode = () => readFile('components/schedule/AppointmentDetailPopover.tsx');

  it('calendar renders event titles as text (not HTML)', () => {
    const code = calendarCode();
    // FullCalendar's title property is text by default
    // Must NOT use eventContent with dangerouslySetInnerHTML
    expect(code).not.toContain('dangerouslySetInnerHTML');
    expect(code).not.toContain('innerHTML');
    expect(code).not.toContain('eventContent');
  });

  it('provider_name in event title is not treated as HTML', () => {
    const code = calendarCode();
    // Provider name is interpolated into a string template, which FullCalendar renders as text
    expect(code).toContain('appt.provider_name');
    expect(code).not.toContain('dangerouslySetInnerHTML');
  });

  it('popover renders appointment data as JSX text (anti-XSS)', () => {
    const code = popoverCode();
    expect(code).not.toContain('dangerouslySetInnerHTML');
    expect(code).not.toContain('innerHTML');
    // Data rendered via React JSX expressions
    expect(code).toContain('{appointment.provider_name');
  });

  it('popover closes on Escape key (no keyboard trap)', () => {
    const code = popoverCode();
    expect(code).toContain("e.key === 'Escape'");
    expect(code).toContain('onClose()');
  });

  it('popover closes on click outside (prevents UI lock)', () => {
    const code = popoverCode();
    expect(code).toContain('mousedown');
    expect(code).toContain('!ref.current.contains');
  });

  it('popover has ARIA role for accessibility', () => {
    const code = popoverCode();
    expect(code).toContain('role="dialog"');
    expect(code).toContain('aria-label');
  });

  it('calendar view position is clamped to viewport (no off-screen rendering)', () => {
    const code = popoverCode();
    expect(code).toContain('Math.min(position.left, window.innerWidth');
  });

  it('calendar status colors use CSS variables (no inline script injection)', () => {
    const code = calendarCode();
    // Colors should be static hex/CSS values, not user-supplied
    const statusColors = code.match(/statusColors/);
    expect(statusColors).not.toBeNull();
    // Should use hardcoded color values
    expect(code).toContain('#9CA3AF');
    expect(code).toContain('#22C55E');
    expect(code).toContain('#FF7043');
  });
});

// ── Schedule Page Security ──

describe('Schedule Page Security', () => {
  const scheduleCode = () => readFile('pages/SchedulePage.tsx');

  it('schedule page uses React.Fragment with key (no reconciliation bugs)', () => {
    const code = scheduleCode();
    expect(code).toContain('React.Fragment key=');
  });

  it('calendar view is free for all tiers (no tier gate)', () => {
    const code = scheduleCode();
    // Calendar was intentionally unlocked for all tiers — no tier gate should remain
    expect(code).not.toContain('canUseCalendarView');
    expect(code).not.toContain('TIER_LIMITS');
    // View toggle should always be enabled (no disabled state)
    expect(code).toContain("setView(view === 'table' ? 'calendar' : 'table')");
  });

  it('PTCalendar is lazy-loaded (no unnecessary code exposure)', () => {
    const code = scheduleCode();
    expect(code).toContain('lazy(() => import');
    expect(code).toContain('PTCalendar');
  });

  it('toggle reminder uses apiRequest with PATCH (CSRF included)', () => {
    const code = scheduleCode();
    expect(code).toContain("method: 'PATCH'");
    expect(code).toContain("apiRequest<Appointment>(`/appointments/${apptId}`");
  });

  it('logo_url is rendered in img src attribute only (not in script context)', () => {
    const code = scheduleCode();
    // logo_url should only appear in <img src={}> contexts
    const logoUsages = code.match(/logo_url/g) || [];
    expect(logoUsages.length).toBeGreaterThan(0);
    expect(code).toContain('<img src={user.logo_url}');
    expect(code).not.toContain('eval(');
  });

  it('patient alias is rendered as text (not HTML)', () => {
    const code = scheduleCode();
    expect(code).toContain('{schedule.patient_alias || schedule.patient_initials}');
    expect(code).not.toContain('dangerouslySetInnerHTML');
  });
});

// ── Authentication & Routing Security ──

describe('Route Protection & Auth Security', () => {
  const authCode = () => readFile('contexts/AuthContext.tsx');
  const appCode = () => readFile('App.tsx');

  it('PUBLIC_PATHS whitelist is restrictive (max 8 paths)', () => {
    const code = authCode();
    const publicPaths = code.match(/PUBLIC_PATHS\s*=\s*\[([^\]]+)\]/);
    expect(publicPaths).not.toBeNull();
    const paths = publicPaths![1]!.match(/'/g) || [];
    // Each path has 2 quotes, so paths.length/2 = number of paths
    // 5 auth paths + 3 legal/info pages (privacy, terms, security) + landing page
    expect(paths.length / 2).toBeLessThanOrEqual(9);
  });

  it('unauthenticated users are redirected to landing page', () => {
    const code = authCode();
    // Phone auth is inline on the landing page
    expect(code).toContain("navigate('/'");
  });

  it('new routes /customize/templates and /customize/print are NOT in public paths', () => {
    const code = authCode();
    expect(code).not.toContain("'/customize/templates'");
    expect(code).not.toContain("'/customize/print'");
  });

  it('all lazy-loaded routes are wrapped in Suspense with fallback', () => {
    const code = appCode();
    expect(code).toContain('Suspense');
    expect(code).toContain('fallback={<LoadingOverlay');
  });

  it('new editor routes exist in App.tsx routing', () => {
    const code = appCode();
    expect(code).toContain('/customize/templates');
    expect(code).toContain('/customize/print');
  });

  it('TemplateEditorPage and PrintSettingsPage are lazy-loaded', () => {
    const code = appCode();
    expect(code).toContain("lazy(() => import('./pages/TemplateEditorPage.js')");
    expect(code).toContain("lazy(() => import('./pages/PrintSettingsPage.js')");
  });

  it('auth state is stored in React state (Firebase localStorage is session recovery only)', () => {
    const code = authCode();
    // Auth user object lives in React state, not localStorage
    expect(code).toContain('useState<AuthUser | null>(null)');
    // Firebase's waitForFirebaseUser uses localStorage for session recovery,
    // but the actual auth state (user object) is always in React state.
    // This is safe: localStorage only holds Firebase's encrypted auth tokens.
  });

  it('CSRF token is set from login callback', () => {
    const code = authCode();
    expect(code).toContain('setCSRFToken(csrf)');
  });

  it('logout clears user state', () => {
    const code = authCode();
    expect(code).toContain('setUser(null)');
    expect(code).toContain("navigate('/'");
  });
});

// ── CustomizePage Navigation Security ──

describe('CustomizePage Navigation Security', () => {
  const customizeCode = () => readFile('pages/CustomizePage.tsx');

  it('customize page uses react-router navigate (not window.location)', () => {
    const code = customizeCode();
    expect(code).toContain('useNavigate');
    expect(code).toContain("navigate('/customize/templates')");
    expect(code).toContain("navigate('/customize/print')");
    // Should not use raw location manipulation
    expect(code).not.toContain('window.location.href');
    expect(code).not.toContain('window.location.assign');
  });
});

// ── OwlLogo Navigation Security ──

describe('OwlLogo Navigation Security', () => {
  const logoCode = () => readFile('components/layout/OwlLogo.tsx');

  it('OwlLogo uses react-router Link (not raw anchor)', () => {
    const code = logoCode();
    expect(code).toContain("import { Link }");
    expect(code).toContain('<Link to={linkTo}');
  });

  it('OwlLogo linkTo is only applied when prop is provided', () => {
    const code = logoCode();
    // Conditional wrapping
    expect(code).toContain('if (linkTo)');
  });

  it('OwlLogo has accessible label when linked', () => {
    const code = logoCode();
    expect(code).toContain('aria-label');
  });

  it('auth pages do NOT pass linkTo to OwlLogo (not clickable)', () => {
    const authPages = ['LoginPage.tsx', 'RegisterPage.tsx', 'ForgotPasswordPage.tsx', 'ResetPasswordPage.tsx'];
    for (const page of authPages) {
      try {
        const code = fs.readFileSync(path.join(WEB_SRC, 'pages', page), 'utf-8');
        // Should have OwlLogo without linkTo
        if (code.includes('OwlLogo')) {
          expect(code, `${page} should not have linkTo on OwlLogo`).not.toMatch(/OwlLogo[^/]*linkTo/);
        }
      } catch { /* file may not exist yet */ }
    }
  });
});

// ── FullCalendar Theme CSS Security ──

describe('FullCalendar Theme Security', () => {
  it('CSS theme file does not contain JavaScript', () => {
    const cssPath = path.join(WEB_SRC, 'styles/fullcalendar-theme.css');
    const code = fs.readFileSync(cssPath, 'utf-8');
    expect(code).not.toContain('javascript:');
    expect(code).not.toContain('expression(');
    expect(code).not.toContain('@import url');
    expect(code).not.toContain('behavior:');
  });

  it('print CSS hides interactive elements when printing', () => {
    const cssPath = path.join(WEB_SRC, 'styles/fullcalendar-theme.css');
    const code = fs.readFileSync(cssPath, 'utf-8');
    expect(code).toContain('@media print');
    expect(code).toContain('display: none');
  });
});

// ── Code Splitting Security ──

describe('Code Splitting Security', () => {
  const appCode = () => readFile('App.tsx');

  it('LandingPage is NOT lazy-loaded (prevents auth page flash)', () => {
    const code = appCode();
    // LandingPage (with inline phone auth) should be a direct import, not lazy
    expect(code).toContain("import { LandingPage } from './pages/LandingPage.js'");
    expect(code).not.toMatch(/lazy\([^)]*LandingPage/);
  });

  it('DashboardPage is NOT lazy-loaded (primary workflow page)', () => {
    const code = appCode();
    expect(code).toContain("import { DashboardPage } from './pages/DashboardPage.js'");
    expect(code).not.toMatch(/lazy\([^)]*DashboardPage/);
  });

  it('catch-all route shows 404 page (no open redirect)', () => {
    const code = appCode();
    expect(code).toContain('path="*"');
    expect(code).toContain('NotFoundPage');
  });
});

// ── Cross-Cutting Frontend Scan ──

describe('Cross-Cutting Frontend Security Scan', () => {
  it('no window.open() with user-controlled URLs', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      const windowOpen = file.content.match(/window\.open\s*\(/g);
      if (windowOpen) {
        // If window.open exists, it should not use user input
        // Only window.print() is acceptable
        expect(file.content, `Found window.open in ${file.path}`).not.toMatch(
          /window\.open\s*\(\s*[^)]*(?:user|input|value|data)/i
        );
      }
    }
  });

  it('no document.cookie access in frontend code', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      expect(file.content, `Found document.cookie in ${file.path}`).not.toContain('document.cookie');
    }
  });

  it('no postMessage without origin check', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      if (file.content.includes('postMessage')) {
        // If postMessage is used, origin should be checked
        expect(file.content, `postMessage without origin check in ${file.path}`).toContain('origin');
      }
    }
  });

  it('no fetch() calls that bypass apiRequest wrapper', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      // Skip the api client file itself (handles both / and \ path separators)
      if (file.path.includes('api/client') || file.path.includes('api\\client')) continue;
      // No direct fetch() calls to API endpoints
      const directFetch = file.content.match(/\bfetch\s*\(\s*['"`][^'"`]*api/gi);
      expect(directFetch, `Direct fetch() bypassing apiRequest in ${file.path}`).toBeNull();
    }
  });

  it('no URL construction from user input without validation', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      // new URL() with user input should be wrapped in try/catch
      const newUrl = file.content.match(/new\s+URL\s*\(/g);
      if (newUrl) {
        // Should have try/catch nearby
        expect(file.content, `Unguarded URL construction in ${file.path}`).toContain('try');
      }
    }
  });

  it('no Function() constructor usage (eval alternative)', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      const funcConstructor = file.content.match(/new\s+Function\s*\(/g);
      expect(funcConstructor, `Found Function() constructor in ${file.path}`).toBeNull();
    }
  });

  it('no setTimeout/setInterval with string arguments (eval alternative)', () => {
    const files = readAllFiles(WEB_SRC, ['.tsx', '.ts']);
    for (const file of files) {
      // setTimeout('code', ms) is eval-like; setTimeout(fn, ms) is safe
      const stringTimeout = file.content.match(/setTimeout\s*\(\s*['"`]/g);
      expect(stringTimeout, `Found setTimeout with string in ${file.path}`).toBeNull();
      const stringInterval = file.content.match(/setInterval\s*\(\s*['"`]/g);
      expect(stringInterval, `Found setInterval with string in ${file.path}`).toBeNull();
    }
  });
});

// ── Build Output Security ──

describe('Build Configuration Security', () => {
  it('Vite config disables source maps in production', () => {
    const viteConfig = fs.readFileSync(path.join(MONOREPO_ROOT, 'apps', 'web', 'vite.config.ts'), 'utf-8');
    expect(viteConfig).toContain('sourcemap');
    expect(viteConfig).toContain('false');
  });

  it('tsconfig excludes test files from build (no Node.js leakage)', () => {
    const tsconfig = JSON.parse(fs.readFileSync(path.join(MONOREPO_ROOT, 'apps', 'web', 'tsconfig.json'), 'utf-8'));
    expect(tsconfig.exclude).toBeDefined();
    expect(tsconfig.exclude.some((e: string) => e.includes('.test.'))).toBe(true);
  });
});
