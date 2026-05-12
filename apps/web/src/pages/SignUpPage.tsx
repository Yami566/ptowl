import { SignUp } from '@clerk/clerk-react';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

/**
 * Sign-up page mounted at /accounts/signup. Mirror of SignInPage —
 * see that file for the architecture rationale.
 */
export function SignUpPage() {
  usePageTitle('Create an account');
  const { user } = useAuth();

  if (user) return null;

  return (
    <main style={pageStyles}>
      <SignUp
        path="/accounts/signup"
        routing="path"
        signInUrl="/accounts/signin"
        fallbackRedirectUrl="/dashboard"
        appearance={clerkAppearance}
      />
    </main>
  );
}

// Mirror of the appearance config in SignInPage.tsx so sign-up reads
// as the same product. See that file for the rationale on colors.
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
