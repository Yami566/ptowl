import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.js';
import { LoadingOverlay } from './components/LoadingOverlay.js';

// Critical path — keep in main bundle
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';

// Lazy-loaded routes — split into separate chunks
const RegisterPage = lazy(() => import('./pages/RegisterPage.js').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.js').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.js').then(m => ({ default: m.ResetPasswordPage })));
const PendingPage = lazy(() => import('./pages/PendingPage.js').then(m => ({ default: m.PendingPage })));
const SchedulePage = lazy(() => import('./pages/SchedulePage.js').then(m => ({ default: m.SchedulePage })));
const CustomizePage = lazy(() => import('./pages/CustomizePage.js').then(m => ({ default: m.CustomizePage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage.js').then(m => ({ default: m.ProfilePage })));
const AdminPage = lazy(() => import('./pages/AdminPage.js').then(m => ({ default: m.AdminPage })));
const TemplateEditorPage = lazy(() => import('./pages/TemplateEditorPage.js').then(m => ({ default: m.TemplateEditorPage })));
const PrintSettingsPage = lazy(() => import('./pages/PrintSettingsPage.js').then(m => ({ default: m.PrintSettingsPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage.js').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage.js').then(m => ({ default: m.TermsOfServicePage })));
const SecurityPage = lazy(() => import('./pages/SecurityPage.js').then(m => ({ default: m.SecurityPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.js').then(m => ({ default: m.NotFoundPage })));

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>
        <Suspense fallback={<LoadingOverlay message="Loading..." />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/pending" element={<PendingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/schedule/:id" element={<SchedulePage />} />
            <Route path="/customize" element={<CustomizePage />} />
            <Route path="/customize/templates" element={<TemplateEditorPage />} />
            <Route path="/customize/print" element={<PrintSettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
