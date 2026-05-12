import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

/**
 * Sign-in page mounted at /accounts/sign-in (and any subpath Clerk routes
 * to internally — factor-one, verify-email, etc.). The parent route in
 * App.tsx uses a wildcard suffix so Clerk's internal step routing works
 * inside the same mount path.
 *
 * Why a same-origin embedded component instead of an anchor redirect
 * to clerk.ptowl.com:
 *   - URL bar stays on the canonical domain (ptowl.com/accounts/sign-in).
 *   - No third-party domain hop in the auth flow (better trust signal).
 *   - Different from the prior failed attempt with <SignInButton> — that
 *     component wraps a child and injects a click handler that
 *     ad-blockers occasionally clobbered. The full <SignIn> component
 *     renders the form inline; if the Clerk SDK loads at all (which it
 *     must for the rest of the app), this works.
 *
 * JWT verification on the API side is unaffected: the JWKS issuer URL
 * (CLERK_FRONTEND_API_URL=https://clerk.ptowl.com) is decoupled from
 * where the sign-in form renders.
 */
export function SignInPage() {
  usePageTitle('Sign in');
  const { user } = useAuth();

  // Signed-in visitors get bounced to dashboard by AuthContext within
  // a fraction of a second; render nothing in the interim to avoid a
  // flash of the sign-in form.
  if (user) return null;

  return (
    <main style={pageStyles}>
      <SignIn
        path="/accounts/sign-in"
        routing="path"
        signUpUrl="/accounts/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}

const pageStyles: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
  background: 'var(--off-white)',
};
