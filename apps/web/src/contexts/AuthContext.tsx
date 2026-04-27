import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';
import { waitForFirebaseUser, auth as firebaseAuth } from '../firebase.js';
import { signOut } from 'firebase/auth';

interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  display_name: string;
  status?: string;
  role: string;
  tier: string;
  user_type?: 'clinic' | 'patient';
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
  clinic_email?: string;
  logo_url?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (user: AuthUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ['/', '/pending', '/about', '/privacy', '/terms', '/security'];
const PATIENT_PATHS = ['/my-schedules'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshUser = useCallback(async () => {
    // Refresh JWT cookie if it's near expiry (CSRF is now origin-based, no token to manage)
    await apiRequest('/auth/refresh', { method: 'POST' });

    const result = await apiRequest<AuthUser>('/auth/me');
    if (result.ok && result.data) {
      setUser(result.data);
    } else {
      setUser(null);
    }
  }, []);

  // On mount: check Firebase first, then try JWT cookie refresh
  useEffect(() => {
    (async () => {
      // 1. Try JWT cookie refresh (fastest path — cookie may still be valid)
      const refreshResult = await apiRequest('/auth/refresh', { method: 'POST' });
      if (refreshResult.ok) {
        const meResult = await apiRequest<AuthUser>('/auth/me');
        if (meResult.ok && meResult.data) {
          setUser(meResult.data);
          setLoading(false);
          return;
        }
      }

      // 2. Cookie expired — check if Firebase still has a session (localStorage persistence)
      const firebaseUser = await waitForFirebaseUser();
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        // Re-authenticate with backend using Firebase token
        const authResult = await apiRequest<{ user: AuthUser }>('/auth/firebase', {
          method: 'POST',
          body: JSON.stringify({ idToken }),
        });
        if (authResult.ok && authResult.data) {
          setUser(authResult.data.user);
          setLoading(false);
          return;
        }
      }

      // 3. No valid session anywhere
      setUser(null);
      setLoading(false);
    })();
  }, []);

  // Redirect logic — runs AFTER loading completes
  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.includes(location.pathname);

    if (!user && !isPublic) {
      navigate('/', { replace: true });
    } else if (user && user.status === 'pending' && location.pathname !== '/pending') {
      navigate('/pending', { replace: true });
    } else if (user && user.status !== 'pending' && location.pathname === '/pending') {
      navigate('/dashboard', { replace: true });
    } else if (user && user.status !== 'pending' && location.pathname === '/') {
      const home = user.user_type === 'patient' ? '/my-schedules' : '/dashboard';
      navigate(home, { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // Called by the phone auth form after successful verification
  const login = useCallback((userData: AuthUser) => {
    setUser(userData);
    // Navigation handled by redirect logic above
  }, []);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    await signOut(firebaseAuth).catch(() => {});
    setUser(null);
    navigate('/', { replace: true });
  }, [navigate]);

  // Public paths render immediately — they don't depend on the user. The
  // per-route guards (ProtectedRoute, ClinicRoute, PatientRoute, AdminRoute)
  // still gate protected components on `loading`, so there's no flash of
  // protected content. Blocking globally caused white-screen-on-link-tap in
  // sandboxed in-app browsers (iMessage / SFSafariViewController) where
  // Firebase's localStorage persistence can hang for seconds.
  const isPublicPath = PUBLIC_PATHS.includes(location.pathname);
  if (loading && !isPublicPath) {
    return (
      <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
        <LoadingOverlay message="Verifying session..." />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * ProtectedRoute — route guard that prevents component mounting for
 * unauthenticated users. Used in App.tsx to wrap all authenticated routes.
 *
 * This is the primary defense: if auth resolves with no user,
 * the child component is NEVER mounted (no constructor, no useEffect,
 * no DOM elements, nothing to inspect in DevTools).
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  // Should not happen since AuthProvider blocks rendering while loading,
  // but guard defensively anyway.
  if (loading) return <LoadingOverlay message="Verifying session..." />;

  // No user = not authenticated → redirect to landing page
  if (!user) return <Navigate to="/" replace />;

  // Pending users can only see /pending
  if (user.status === 'pending') return <Navigate to="/pending" replace />;

  return <>{children}</>;
}

/**
 * ClinicRoute — route guard that requires clinic user_type (or legacy users without user_type).
 * Redirects patients to /my-schedules.
 */
export function ClinicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingOverlay message="Verifying session..." />;
  if (!user) return <Navigate to="/" replace />;
  if (user.status === 'pending') return <Navigate to="/pending" replace />;
  if (user.user_type === 'patient') return <Navigate to="/my-schedules" replace />;

  return <>{children}</>;
}

/**
 * PatientRoute — route guard that requires patient user_type.
 */
export function PatientRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingOverlay message="Verifying session..." />;
  if (!user) return <Navigate to="/" replace />;
  if (user.user_type !== 'patient') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

/**
 * AdminRoute — additional guard that requires admin role + 2FA verification.
 * The AdminPage component handles the 2FA step internally, so this only
 * checks basic auth + admin role.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingOverlay message="Verifying session..." />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}
