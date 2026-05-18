import { useEffect, useState } from 'react';
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
import { fetchClerkStrategies } from '../lib/clerk-strategy.js';

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
  // Defensive Clerk-config probe — symmetric with SignUpFormPage.
  // See apps/web/src/lib/clerk-strategy.ts for the rationale (the
  // 2026-05-18 user-screenshot incident where a raw dashboard URL
  // leaked into the inline error).
  const [emailSupported, setEmailSupported] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchClerkStrategies().then((r) => {
      if (!cancelled) setEmailSupported(r.supportsEmail);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (authLoading) return <LoadingOverlay message="Just a moment…" />;
  if (user) return null; // AuthContext will redirect to /dashboard

  // Maintenance state — Clerk dashboard has email auth disabled.
  // Symmetric with SignUpFormPage's maintenance card.
  if (emailSupported === false) {
    return (
      <AuthCard title="Sign-in is being set up" subtitle="We're configuring the welcome flow.">
        <p style={formStyles.maintenanceBody}>
          Sign-in isn&apos;t accepting email accounts right now. Please reach out to{' '}
          <a href="mailto:help@ptowl.com" style={formStyles.maintenanceLink}>
            help@ptowl.com
          </a>
          .
        </p>
        <AuthFooterLink prefix="New here?" linkText="Sign Up" to="/signup" />
      </AuthCard>
    );
  }

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
  maintenanceBody: {
    fontSize: '0.95rem',
    color: 'var(--gray-text)',
    textAlign: 'center' as const,
    margin: 0,
    marginBottom: '1.25rem',
    lineHeight: 1.5,
  },
  maintenanceLink: {
    color: 'var(--green-mid)',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
