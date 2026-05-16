import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
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
  pendingApproval: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const PUBLIC_PATHS = [
  '/',
  '/about',
  '/privacy',
  '/terms',
  '/security',
  '/awaiting-approval',
  '/admin/decide',
  '/displaced',
];

// Patient-facing routes share a /p/ prefix. They never require a Clerk
// session (the URL token is the credential). AuthContext skips the
// auth-redirect logic for any path under this prefix.
const PUBLIC_PATH_PREFIXES = ['/p/'];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Stage L (single-device kick) signals. previousIsSignedInRef tracks the
  // previous Clerk session state so we can detect when isSignedIn flipped
  // true → false. wasExplicitLogoutRef is set true inside logout() so
  // intentional sign-outs don't get routed to /displaced.
  const previousIsSignedInRef = useRef(false);
  const wasExplicitLogoutRef = useRef(false);

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
      setPendingApproval(false);
    } else if (result.error?.code === 'PENDING_APPROVAL') {
      // Clerk session is valid; D1 row exists but founder hasn't
      // approved yet. Track this distinctly from "signed out" so
      // ClinicRoute can route to /awaiting-approval instead of /.
      setUser(null);
      setPendingApproval(true);
    } else {
      setUser(null);
      setPendingApproval(false);
    }
  }, []);

  // React to Clerk auth state changes. When Clerk reports a signed-in
  // user, we provision/load the matching D1 row. When Clerk reports
  // signed-out, we clear local state.
  //
  // If Clerk doesn't finish initializing within MAX_CLERK_INIT_MS
  // (e.g., the origin isn't in Clerk's allowed-domains list, network
  // issue, ad blocker), we still flip loading to false so the landing
  // page renders the sign-in widget instead of hanging on
  // "Welcome back — restoring your session..." forever. The widget
  // itself will surface the underlying Clerk error in that case.
  useEffect(() => {
    let cancelled = false;
    const MAX_CLERK_INIT_MS = 3000;
    const timeoutId = setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, MAX_CLERK_INIT_MS);

    if (!clerkLoaded) {
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }

    // Stage L (docs/AUTH-LIFECYCLE.md §23) — detect Clerk's single-session-
    // mode kick OR a regular token expiry. Both look the same from here:
    // isSignedIn flipped true → false WITHOUT an explicit logout call.
    // We route to /displaced so the user gets a friendly explanation
    // instead of the bare landing page bounce.
    const wasSignedIn = previousIsSignedInRef.current;
    previousIsSignedInRef.current = isSignedIn;
    if (wasSignedIn && !isSignedIn && !wasExplicitLogoutRef.current) {
      setUser(null);
      setPendingApproval(false);
      if (!cancelled) setLoading(false);
      navigate('/displaced', { replace: true });
      return () => {
        cancelled = true;
        clearTimeout(timeoutId);
      };
    }
    wasExplicitLogoutRef.current = false;

    (async () => {
      if (isSignedIn) {
        await refreshUser();
      } else if (!cancelled) {
        setUser(null);
      }
      if (!cancelled) {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [clerkLoaded, isSignedIn, refreshUser, navigate]);

  // Redirect logic runs AFTER loading completes.
  //
  // What this handles:
  //   1. PENDING_APPROVAL → /awaiting-approval (must beat any other rule)
  //   2. Signed-in user landing on / → /dashboard (one-step entry)
  //
  // What this DOES NOT do (anymore — was a bug fixed 2026-05-16 after
  // browser-level e2e testing surfaced it):
  //   • Redirect unsigned users away from non-public paths. ClinicRoute
  //     already does that via <Navigate to="/" /> for every protected
  //     route, and NotFoundPage at path="*" needs to render for
  //     unmatched URLs. The previous blanket redirect was clobbering
  //     /accounts/signin, /accounts/signup, /this-bad-url, and any
  //     future routes that aren't in PUBLIC_PATHS — making Clerk's
  //     embedded sign-in widget unreachable directly and the 404 page
  //     dead. See scripts/e2e-live.mjs for the regression test.
  useEffect(() => {
    if (loading) return;
    if (pendingApproval && location.pathname !== '/awaiting-approval') {
      navigate('/awaiting-approval', { replace: true });
    } else if (user && location.pathname === '/') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, pendingApproval, loading, location.pathname, navigate]);

  // Called by the auth UI after successful Clerk verification (used in
  // the rare case where we need to force a /auth/me roundtrip without
  // waiting for the Clerk listener microtask).
  const login = useCallback(async () => {
    await refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    // Flag so the Clerk-state-change effect doesn't misinterpret this as
    // a single-device kick and route to /displaced.
    wasExplicitLogoutRef.current = true;
    await clerk.signOut().catch(() => {});
    setUser(null);
    setPendingApproval(false);
    navigate('/', { replace: true });
  }, [clerk, navigate]);

  // Public paths render immediately — they don't depend on the user.
  // Per-route guards (ProtectedRoute, ClinicRoute) still gate protected
  // components on `loading`.
  const isPublic = isPublicPath(location.pathname);
  if (loading && !isPublic) {
    return (
      <AuthContext.Provider value={{ user, loading, pendingApproval, login, logout, refreshUser }}>
        <LoadingOverlay message="Verifying session..." />
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, pendingApproval, login, logout, refreshUser }}>
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
