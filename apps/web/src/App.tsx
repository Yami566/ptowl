import { Suspense, lazy, useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider, ProtectedRoute, ClinicRoute, AdminRoute } from './contexts/AuthContext.js';
import { LoadingOverlay } from './components/LoadingOverlay.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { CommandPalette } from './components/CommandPalette.js';
import { KeyboardShortcutsOverlay } from './components/KeyboardShortcutsOverlay.js';
import { IdleTimeoutGuard } from './components/IdleTimeoutGuard.js';
import { OfflineBanner } from './components/OfflineBanner.js';
import 'react-loading-skeleton/dist/skeleton.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
});

// Critical path — keep in main bundle
import { DashboardPage } from './pages/DashboardPage.js';
import { LandingPage } from './pages/LandingPage.js';

// Lazy-loaded routes — split into separate chunks
const PendingPage = lazy(() =>
  import('./pages/PendingPage.js').then((m) => ({ default: m.PendingPage })),
);
const SchedulePage = lazy(() =>
  import('./pages/SchedulePage.js').then((m) => ({ default: m.SchedulePage })),
);
const CustomizePage = lazy(() =>
  import('./pages/CustomizePage.js').then((m) => ({ default: m.CustomizePage })),
);
const ProfilePage = lazy(() =>
  import('./pages/ProfilePage.js').then((m) => ({ default: m.ProfilePage })),
);
const AdminPage = lazy(() =>
  import('./pages/AdminPage.js').then((m) => ({ default: m.AdminPage })),
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
          <IdleTimeoutGuard />
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
                <Route path="/pending" element={<PendingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/terms" element={<TermsOfServicePage />} />
                <Route path="/security" element={<SecurityPage />} />

                {/* Protected routes — require authenticated + approved user */}
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
                  path="/customize"
                  element={
                    <ClinicRoute>
                      <CustomizePage />
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

                {/* Admin route — requires admin role */}
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminPage />
                    </AdminRoute>
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
