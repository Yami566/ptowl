import { SignIn } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

/**
 * Sign-in page mounted at /accounts/signin (and any subpath Clerk routes
 * to internally — factor-one, verify-email, etc.). The parent route in
 * App.tsx uses a wildcard suffix so Clerk's internal step routing works
 * inside the same mount path.
 *
 * Why a same-origin embedded component instead of an anchor redirect
 * to clerk.ptowl.com:
 *   - URL bar stays on the canonical domain (ptowl.com/accounts/signin).
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
        path="/accounts/signin"
        routing="path"
        signUpUrl="/accounts/signup"
        fallbackRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />
    </main>
  );
}

// Match the embedded Clerk form to PTOwl's brand tokens so the
// sign-in screen looks first-party instead of using Clerk's default
// purple. Green primary (--green-mid), orange accent for danger
// states (--orange-mid), royal-violet for focus rings as a nod to
// the dark-theme purple palette.
const clerkAppearance = {
  variables: {
    colorPrimary: '#4caf50',
    colorDanger: '#e53935',
    colorSuccess: '#43a047',
    colorWarning: '#ff7043',
    colorTextOnPrimaryBackground: '#ffffff',
    borderRadius: '0.5rem',
    fontFamily: '"Outfit", system-ui, sans-serif',
  },
  elements: {
    formButtonPrimary: {
      backgroundColor: '#4caf50',
      '&:hover': { backgroundColor: '#43a047' },
      '&:focus': { boxShadow: '0 0 0 3px rgba(108, 71, 255, 0.35)' },
    },
    card: { boxShadow: '0 8px 32px rgba(15, 32, 39, 0.08)' },
  },
};

const pageStyles: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '2rem 1rem',
  background: 'var(--off-white)',
};
