import { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, ClinicRoute } from './contexts/AuthContext.js';
import { A11yProvider } from './contexts/A11yContext.js';
import { A11ySettingsPanel } from './components/A11ySettingsPanel.js';
import { LoadingOverlay } from './components/LoadingOverlay.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { CommandPalette } from './components/CommandPalette.js';
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcutsOverlay.js';
import { OfflineBanner } from './components/OfflineBanner.js';
import 'react-loading-skeleton/dist/skeleton.css';
import './styles/a11y.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
});

// Critical path — keep in main bundle
import { DashboardPage } from './pages/DashboardPage.js';
import { LandingPage } from './pages/LandingPage.js';

// Lazy-loaded routes — split into separate chunks
const SchedulePage = lazy(() =>
  import('./pages/SchedulePage.js').then((m) => ({ default: m.SchedulePage })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage.js').then((m) => ({ default: m.ProfilePage })),
);
const TemplateEditorPage = lazy(() =>
  import('./pages/TemplateEditorPage.js').then((m) => ({ default: m.TemplateEditorPage })),
);
const PrintSettingsPage = lazy(() =>
  import('./pages/PrintSettingsPage.js').then((m) => ({ default: m.PrintSettingsPage })),
);
const PrivacyPolicyPage = lazy(() =>
  import('./pages/PrivacyPolicyPage.js').then((m) => ({ default: m.PrivacyPolicyPage })),
);
const TermsOfServicePage = lazy(() =>
  import('./pages/TermsOfServicePage.js').then((m) => ({ default: m.TermsOfServicePage })),
);
const SecurityPage = lazy(() =>
  import('./pages/SecurityPage.js').then((m) => ({ default: m.SecurityPage })),
);
const AboutPage = lazy(() =>
  import('./pages/AboutPage.js').then((m) => ({ default: m.AboutPage })),
);
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage.js').then((m) => ({ default: m.NotFoundPage })),
);
const PatientSchedulePage = lazy(() =>
  import('./pages/PatientSchedulePage.js').then((m) => ({ default: m.PatientSchedulePage })),
);
const SignInPage = lazy(() =>
  import('./pages/SignInPage.js').then((m) => ({ default: m.SignInPage })),
);
const SignUpPage = lazy(() =>
  import('./pages/SignUpPage.js').then((m) => ({ default: m.SignUpPage })),
);
const AwaitingApprovalPage = lazy(() =>
  import('./pages/AwaitingApprovalPage.js').then((m) => ({ default: m.AwaitingApprovalPage })),
);
const AdminDecidePage = lazy(() =>
  import('./pages/AdminDecidePage.js').then((m) => ({ default: m.AdminDecidePage })),
);
const DisplacedPage = lazy(() =>
  import('./pages/DisplacedPage.js').then((m) => ({ default: m.DisplacedPage })),
);

export function App() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [a11yOpen, setA11yOpen] = useState(false);

  const handleGlobalKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // Ctrl+K / Cmd+K — open command palette
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
        return;
      }

      // Ctrl+Shift+A / Cmd+Shift+A — open accessibility settings.
      // Works even while typing in an input so users with motor or
      // vision constraints can summon it from anywhere.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setA11yOpen((prev) => !prev);
        return;
      }

      // ? — open keyboard shortcuts (only when not typing)
      if (e.key === '?' && !isInput && !cmdOpen) {
        e.preventDefault();
        setShortcutsOpen(true);
      }
    },
    [cmdOpen],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleGlobalKeyDown]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <A11yProvider>
          <AuthProvider>
            <Toaster position="top-right" richColors closeButton />
            <OfflineBanner />
            <CommandPalette
              open={cmdOpen}
              onOpenChange={setCmdOpen}
              onShowShortcuts={() => {
                setCmdOpen(false);
                setShortcutsOpen(true);
              }}
            />
            <KeyboardShortcutsOverlay
              open={shortcutsOpen}
              onClose={() => setShortcutsOpen(false)}
            />
            <A11ySettingsPanel open={a11yOpen} onClose={() => setA11yOpen(false)} />
            <a href="#main-content" className="skip-to-main">
              Skip to main content
            </a>
            <Suspense fallback={<LoadingOverlay message="Just a moment…" />}>
              <ErrorBoundary>
                <Routes>
                  {/* Public routes — accessible without authentication */}
                  <Route path="/" element={<LandingPage />} />
                  {/* Patient-facing schedule view. The 32-char hex token in
                    the URL is unguessable, generated by /schedules/:id/share,
                    and serves as the credential. No login wall. */}
                  <Route path="/p/:token" element={<PatientSchedulePage />} />
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/privacy" element={<PrivacyPolicyPage />} />
                  <Route path="/terms" element={<TermsOfServicePage />} />
                  <Route path="/security" element={<SecurityPage />} />
                  {/* Embedded Clerk sign-in / sign-up — same-origin so the
                    URL bar stays on ptowl.com. Wildcard suffix is required
                    so Clerk's internal step routing (factor-one, verify-
                    email, etc.) resolves under the same mount path. */}
                  <Route path="/accounts/signin/*" element={<SignInPage />} />
                  <Route path="/accounts/signup/*" element={<SignUpPage />} />
                  {/* Awaiting-approval landing. Auth-aware but accessible
                    to users whose D1 status is 'pending' (AuthContext
                    routes them here on PENDING_APPROVAL). Treated as
                    public-ish so the auth guard doesn't bounce them. */}
                  <Route path="/awaiting-approval" element={<AwaitingApprovalPage />} />
                  {/* Magic-link approval target for the founder. JWT in
                    the URL is the auth — no Clerk session needed. */}
                  <Route path="/admin/decide" element={<AdminDecidePage />} />
                  {/* Stage L — single-device kick page. AuthContext routes
                      here when Clerk's single_session_mode invalidates
                      this device's session (user signed in elsewhere)
                      or when the session naturally expires. */}
                  <Route path="/displaced" element={<DisplacedPage />} />

                  {/* Protected routes — require authenticated user */}
                  <Route
                    path="/dashboard"
                    element={
                      <ClinicRoute>
                        <DashboardPage />
                      </ClinicRoute>
                    }
                  />
                  <Route
                    path="/schedule/:id"
                    element={
                      <ClinicRoute>
                        <SchedulePage />
                      </ClinicRoute>
                    }
                  />
                  <Route
                    path="/customize/templates"
                    element={
                      <ClinicRoute>
                        <TemplateEditorPage />
                      </ClinicRoute>
                    }
                  />
                  <Route
                    path="/customize/print"
                    element={
                      <ClinicRoute>
                        <PrintSettingsPage />
                      </ClinicRoute>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <ClinicRoute>
                        <ProfilePage />
                      </ClinicRoute>
                    }
                  />

                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </ErrorBoundary>
            </Suspense>
          </AuthProvider>
        </A11yProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
