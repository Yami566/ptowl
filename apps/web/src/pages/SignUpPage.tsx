import { useState } from 'react';
import { AuthCard } from '../components/auth/AuthCard.js';
import { ClinicNameField } from '../components/auth/ClinicNameField.js';
import { EmailField } from '../components/auth/EmailField.js';
import { PasswordField } from '../components/auth/PasswordField.js';
import { SubmitButton } from '../components/auth/SubmitButton.js';
import { AuthInlineError } from '../components/auth/AuthInlineError.js';
import { AuthFooterLink } from '../components/auth/AuthFooterLink.js';
import { useSignup } from '../hooks/auth/useSignup.js';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';

/**
 * SignUpPage — custom form for new clinic accounts. Three fields:
 * clinic name, email, password. Powered by Clerk's useSignUp hook.
 *
 * Once Phase 3 (admin approval gate) ships, new signups land in
 * `status='pending'` and get sent to /awaiting-approval on first
 * dashboard fetch. For Phase 2 they reach /dashboard directly.
 */
export function SignUpPage() {
  usePageTitle('Create your account');
  const { user, loading: authLoading } = useAuth();
  const { isLoaded, submit, isSubmitting, error } = useSignup();
  const [clinicName, setClinicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  if (authLoading) return <LoadingOverlay message="Just a moment…" />;
  if (user) return null; // AuthContext redirects signed-in users to /dashboard

  return (
    <AuthCard title="Create your account" subtitle="Pleased to meet you, Doctor.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit({ clinicName, email, password });
        }}
        style={formStyles.form}
      >
        <ClinicNameField
          value={clinicName}
          onChange={setClinicName}
          disabled={isSubmitting}
          autoFocus
        />
        <EmailField value={email} onChange={setEmail} disabled={isSubmitting} />
        <PasswordField
          value={password}
          onChange={setPassword}
          disabled={isSubmitting}
          autoComplete="new-password"
        />
        <AuthInlineError message={error} />
        <SubmitButton
          disabled={!isLoaded}
          isSubmitting={isSubmitting}
          loadingText="Creating account…"
        >
          Sign Up
        </SubmitButton>
      </form>
      <AuthFooterLink prefix="Already have an account?" linkText="Log In" to="/login" />
      <p style={formStyles.disclaimer}>
        Free during beta. No credit card. New accounts may require founder approval — you&apos;ll be
        notified by email when active.
      </p>
    </AuthCard>
  );
}

const formStyles: Record<string, React.CSSProperties> = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  disclaimer: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    textAlign: 'center' as const,
    margin: 0,
    marginTop: '0.5rem',
    lineHeight: 1.5,
  },
};
