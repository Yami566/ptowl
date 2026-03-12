import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiRequest, setCSRFToken } from '../api/client.js';
import { firebaseSignOut } from '../lib/firebase.js';

interface AuthUser {
  id: string;
  email: string;
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
  loginWithFirebase: (idToken: string, displayName?: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = ['/login', '/register', '/pending', '/forgot-password', '/reset-password', '/privacy', '/terms', '/security'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const refreshUser = useCallback(async () => {
    // First refresh JWT + CSRF token (restores CSRF after page reload)
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

  // Check auth on mount
  useEffect(() => {
    (async () => {
      await refreshUser();
      setLoading(false);
    })();
  }, [refreshUser]);

  // Redirect logic
  useEffect(() => {
    if (loading) return;

    const isPublic = PUBLIC_PATHS.includes(location.pathname);

    if (!user && !isPublic) {
      navigate('/login', { replace: true });
    } else if (user && isPublic && !['/pending', '/privacy', '/terms', '/security'].includes(location.pathname)) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // All auth now goes through Firebase → backend token exchange
  const loginWithFirebase = async (idToken: string, displayName?: string) => {
    const result = await apiRequest<{ user: AuthUser; csrfToken: string; isNewUser: boolean }>('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ idToken, displayName }),
    });

    if (result.ok && result.data) {
      setCSRFToken(result.data.csrfToken);
      setUser(result.data.user);

      // New users go to pending, existing approved users go to dashboard
      if (result.data.user.status === 'pending') {
        navigate('/pending', { replace: true });
      }

      return { ok: true };
    }

    return { ok: false, error: result.error?.message || 'Authentication failed' };
  };

  const logout = async () => {
    // Sign out of both Firebase and PTOWL backend
    try { await firebaseSignOut(); } catch { /* ignore */ }
    await apiRequest('/auth/logout', { method: 'POST' });
    setUser(null);
    navigate('/login', { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithFirebase, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
