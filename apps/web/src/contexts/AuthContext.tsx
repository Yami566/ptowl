import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { signOut } from 'firebase/auth';
import { apiRequest } from '../api/client.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';
import { auth as firebaseAuth } from '../firebase.js';

interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  display_name: string;
  status?: string;
  role: string;
  tier: string;
  clinic_name?: string;
  clinic_address?: string;
  clinic_phone?: string;
  clinic_email?: string;
  logo_url?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ['/', '/pending', '/about', '/privacy', '/terms', '/security'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch the current user from /auth/me. apiRequest attaches the
  // Bearer token automatically; the Worker provisions a D1 row on
  // first call (apps/api/src/auth/provision.ts).
  const refreshUser = useCallback(async () => {
    const result = await apiRequest<AuthUser>('/auth/me');
    if (result.ok && result.data) {
      setUser(result.data);
    } else {
      setUser(null);
    }
  }, []);

  // Single source of truth: Firebase's onAuthStateChanged. Fires once
  // synchronously on mount with the persisted user (if any), then on
  // every sign-in / sign-out. The custom JWT cookie + /auth/refresh
  // chain is gone — Firebase auto-refreshes the ID token internally.
  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (fbUser) {
        await refreshUser();
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [refreshUser]);

  // Redirect logic runs AFTER loading completes.
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
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // Called by the phone auth form after successful Firebase verification.
  // onAuthStateChanged also fires; refreshUser there is the canonical
  // path. This explicit call exists so the dashboard renders without
  // waiting for the Firebase listener microtask.
  const login = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await signOut(firebaseAuth).catch(() => {});
    setUser(null);
    navigate('/', { replace: true });
  }, [navigate]);

  // Public paths render immediately — they don't depend on the user.
  // Per-route guards (ProtectedRoute, ClinicRoute, AdminRoute) still
  // gate protected components on `loading`, so there's no flash of
  // protected content. Blocking globally caused white-screen-on-link-
  // tap in sandboxed in-app browsers (iMessage / SFSafariViewController)
  // where Firebase's localStorage persistence can hang for seconds.
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
 * ProtectedRoute — generic guard for any authenticated route. If auth
 * resolves with no user, the child is never mounted.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingOverlay message="Verifying session..." />;
  if (!user) return <Navigate to="/" replace />;
  if (user.status === 'pending') return <Navigate to="/pending" replace />;
  return <>{children}</>;
}

/**
 * ClinicRoute — every authenticated, non-pending user is a clinic since
 * the patient portal was removed.
 */
export function ClinicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingOverlay message="Verifying session..." />;
  if (!user) return <Navigate to="/" replace />;
  if (user.status === 'pending') return <Navigate to="/pending" replace />;
  return <>{children}</>;
}

/**
 * AdminRoute — Firebase-authenticated user with role='admin' in D1.
 * Stage B will move /admin behind Cloudflare Access at the edge; this
 * stays as a defense-in-depth check.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingOverlay message="Verifying session..." />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
