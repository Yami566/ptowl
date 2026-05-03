import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth as useClerkAuth, useClerk } from '@clerk/clerk-react';
import { apiRequest } from '../api/client.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';

interface AuthUser {
  id: string;
  email: string;
  phone?: string;
  display_name: string;
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

const PUBLIC_PATHS = ['/', '/about', '/privacy', '/terms', '/security'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  // Clerk hooks. `isLoaded` flips true once Clerk's session has been
  // checked; `isSignedIn` reflects whether the user has a valid session.
  // signOut is exposed via useClerk because useAuth doesn't include it.
  const { isLoaded: clerkLoaded, isSignedIn } = useClerkAuth();
  const clerk = useClerk();

  // Fetch the current user from /auth/me. apiRequest attaches the
  // Bearer token automatically (Clerk session JWT); the Worker
  // provisions a D1 row on first call (apps/api/src/auth/provision.ts).
  const refreshUser = useCallback(async () => {
    const result = await apiRequest<AuthUser>('/auth/me');
    if (result.ok && result.data) {
      setUser(result.data);
    } else {
      setUser(null);
    }
  }, []);

  // React to Clerk auth state changes. When Clerk reports a signed-in
  // user, we provision/load the matching D1 row. When Clerk reports
  // signed-out, we clear local state.
  useEffect(() => {
    if (!clerkLoaded) return;
    let cancelled = false;
    (async () => {
      if (isSignedIn) {
        await refreshUser();
      } else {
        if (!cancelled) setUser(null);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [clerkLoaded, isSignedIn, refreshUser]);

  // Redirect logic runs AFTER loading completes.
  useEffect(() => {
    if (loading) return;
    const isPublic = PUBLIC_PATHS.includes(location.pathname);
    if (!user && !isPublic) {
      navigate('/', { replace: true });
    } else if (user && location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // Called by the auth UI after successful Clerk verification (used in
  // the rare case where we need to force a /auth/me roundtrip without
  // waiting for the Clerk listener microtask).
  const login = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await clerk.signOut().catch(() => {});
    setUser(null);
    navigate('/', { replace: true });
  }, [clerk, navigate]);

  // Public paths render immediately — they don't depend on the user.
  // Per-route guards (ProtectedRoute, ClinicRoute) still gate protected
  // components on `loading`.
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
  return <>{children}</>;
}

/**
 * ClinicRoute — every authenticated user is a clinic. Kept as a
 * separate name for symmetry with the routes that mount it.
 */
export function ClinicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingOverlay message="Verifying session..." />;
  if (!user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
