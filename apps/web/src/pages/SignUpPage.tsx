import { SignUp } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

/**
 * Sign-up page mounted at /accounts/sign-up. Mirror of SignInPage —
 * see that file for the architecture rationale.
 */
export function SignUpPage() {
  usePageTitle('Create an account');
  const { user } = useAuth();

  if (user) return null;

  return (
    <main style={pageStyles}>
      <SignUp
        path="/accounts/sign-up"
        routing="path"
        signInUrl="/accounts/sign-in"
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
