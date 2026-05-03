import { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { AuthProvider, ClinicRoute } from './contexts/AuthContext.js';
import { LoadingOverlay } from './components/LoadingOverlay.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { CommandPalette } from './components/CommandPalette.js';
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcutsOverlay.js';
import { OfflineBanner } from './components/OfflineBanner.js';
import 'react-loading-skeleton/dist/skeleton.css';

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

export function App() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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
          <KeyboardShortcutsOverlay open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
          <a href="#main-content" className="skip-to-main">
            Skip to main content
          </a>
          <Suspense fallback={<LoadingOverlay message="Loading..." />}>
            <ErrorBoundary>
              <Routes>
                {/* Public routes — accessible without authentication */}
                <Route path="/" element={<LandingPage />} />
                {/* Phase 1 Clerk migration test page. Renders Clerk
                    sign-in/up buttons. Lives at /clerk-test until we
                    cut over the live LandingPage in Phase 2. The
                    ErrorBoundary catches the "no provider" throw if
                    VITE_CLERK_PUBLISHABLE_KEY isn't set yet. */}
                <Route
                  path="/clerk-test"
                  element={
                    <div
                      style={{
                        padding: '3rem 1.5rem',
                        maxWidth: '480px',
                        margin: '0 auto',
                        textAlign: 'center',
                      }}
                    >
                      <h1>Clerk integration test</h1>
                      <p style={{ color: '#666', marginBottom: '2rem' }}>
                        If the buttons below render, Clerk is wired up correctly.
                      </p>
                      <SignedOut>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                          <SignInButton mode="modal" />
                          <SignUpButton mode="modal" />
                        </div>
                      </SignedOut>
                      <SignedIn>
                        <p style={{ color: 'green', fontWeight: 600, marginBottom: '1rem' }}>
                          Signed in via Clerk
                        </p>
                        <UserButton afterSignOutUrl="/clerk-test" />
                      </SignedIn>
                    </div>
                  }
                />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/security" element={<SecurityPage />} />

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
      </BrowserRouter>
    </QueryClientProvider>
  );
}
