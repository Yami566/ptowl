import { useState } from 'react';
import { AuthCard } from '../components/auth/AuthCard.js';
import { EmailField } from '../components/auth/EmailField.js';
import { PasswordField } from '../components/auth/PasswordField.js';
import { SubmitButton } from '../components/auth/SubmitButton.js';
import { AuthInlineError } from '../components/auth/AuthInlineError.js';
import { AuthFooterLink } from '../components/auth/AuthFooterLink.js';
import { useLogin } from '../hooks/auth/useLogin.js';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';

/**
 * LoginPage — custom email + password form using Clerk's useSignIn hook.
 * Same pattern that works on the user's other Clerk-backed site (betraiders.net).
 * Replaces the embedded <SignIn /> component that was rendering blank in
 * Safari/Firefox/Edge.
 */
export function LoginPage() {
  usePageTitle('Log in');
  const { user, loading: authLoading } = useAuth();
  const { isLoaded, submit, isSubmitting, error } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  if (authLoading) return <LoadingOverlay message="Just a moment…" />;
  if (user) return null; // AuthContext will redirect to /dashboard

  return (
    <AuthCard title="Welcome back, Doctor." subtitle="Sign in to print schedules in 5 keypresses.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit({ email, password });
        }}
        style={formStyles.form}
      >
        <EmailField value={email} onChange={setEmail} disabled={isSubmitting} autoFocus />
        <PasswordField
          value={password}
          onChange={setPassword}
          disabled={isSubmitting}
          autoComplete="current-password"
        />
        <label style={formStyles.checkboxRow}>
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isSubmitting}
          />
          <span style={formStyles.checkboxLabel}>Keep me signed in on this device</span>
        </label>
        <AuthInlineError message={error} />
        <SubmitButton disabled={!isLoaded} isSubmitting={isSubmitting} loadingText="Signing in…">
          Log In
        </SubmitButton>
      </form>
      <AuthFooterLink prefix="New here?" linkText="Sign Up" to="/signup" />
    </AuthCard>
  );
}

const formStyles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  checkboxLabel: {
    color: 'var(--gray-text)',
  },
};
