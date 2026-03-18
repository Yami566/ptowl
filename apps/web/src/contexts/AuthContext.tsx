import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { apiRequest, setCSRFToken } from '../api/client.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';

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
  login: (user: AuthUser, csrf: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ['/', '/pending', '/privacy', '/terms', '/security'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshUser = useCallback(async () => {
    // Refresh JWT + CSRF token (restores CSRF after page reload)
    const refreshResult = await apiRequest<{ csrfToken: string }>('/auth/refresh', { method: 'POST' });
    if (refreshResult.ok && refreshResult.data?.csrfToken) {
      setCSRFToken(refreshResult.data.csrfToken);
    }

    const result = await apiRequest<AuthUser>('/auth/me');
    if (result.ok && result.data) {
      setUser(result.data);
    } else {
      setUser(null);
    }
  }, []);

  // On mount: try to restore session from cookie
  useEffect(() => {
    (async () => {
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

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
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // Called by the phone auth form after successful verification
  const login = useCallback((userData: AuthUser, csrf: string) => {
    setCSRFToken(csrf);
    setUser(userData);
    // Navigation handled by redirect logic above
  }, []);

  const logout = useCallback(async () => {
    await apiRequest('/auth/logout', { method: 'POST' });
    setUser(null);
    navigate('/', { replace: true });
  }, [navigate]);

  // SECURITY: Block ALL route rendering until auth check completes.
  // This prevents unauthenticated users from seeing protected components
  // even momentarily during the async auth verification.
  if (loading) {
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
