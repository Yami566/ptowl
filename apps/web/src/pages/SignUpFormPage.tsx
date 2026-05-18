import { useEffect, useState } from 'react';
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
import { fetchClerkStrategies } from '../lib/clerk-strategy.js';

/**
 * SignUpFormPage — custom form for new clinic accounts, mounted at /signup.
 * Wireframe plan §4.3. Three fields: clinic name, email, password.
 * Powered by Clerk's useSignUp hook + AuthContext's existing handling
 * of the PENDING_APPROVAL state (PR #74) — new signups land on
 * /awaiting-approval until the founder approves them.
 *
 * The legacy SignUpPage at /accounts/signup/* uses Clerk's embedded
 * <SignUp/> widget and is kept as a fallback path for ticket-style
 * flows; this page is the primary human-facing entry from the landing.
 */
export function SignUpFormPage() {
  usePageTitle('Create your account');
  const { user, loading: authLoading } = useAuth();
  const { isLoaded, submit, isSubmitting, error } = useSignup();
  const [clinicName, setClinicName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Defensive Clerk-config probe — see lib/clerk-strategy.ts header
  // for why. `emailSupported === null` means "still checking"; we
  // render the form optimistically during the probe (typically <300ms)
  // so the perceived load time matches the pre-probe behaviour.
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
  if (user) return null; // AuthContext redirects signed-in users to /dashboard

  // Maintenance state: Clerk dashboard has email auth disabled. Shows
  // a friendly waitlist card instead of the broken form, so Clerk's
  // raw "email_address is not a valid parameter ... see dashboard
  // at ..." error from the 2026-05-18 user screenshot never reaches
  // end-users. v2 polish: empathetic copy + a real "join the waitlist"
  // mailto link with prefilled subject/body so a visitor's interest
  // actually goes somewhere instead of just being told to wait.
  if (emailSupported === false) {
    const waitlistHref =
      'mailto:help@ptowl.com' +
      '?subject=' +
      encodeURIComponent('PTOwl waitlist — please reach out when sign-ups open') +
      '&body=' +
      encodeURIComponent(
        "Hi PTOwl team,\n\nI'd like to set up an account for my clinic when sign-ups open. " +
          "Here's a bit about us:\n\n" +
          'Clinic name:\nWhat we do (PT / OT / SLP / other):\nApproximate patients per week:\n\n' +
          'Thanks!',
      );
    return (
      <AuthCard title="We're growing carefully" subtitle="Sign-ups are invite-only this week.">
        <p style={formStyles.maintenanceBody}>
          PTOwl is in early access. We&apos;re onboarding clinics one at a time so we can help you
          get set up well. Tell us about your practice and we&apos;ll reach out when a slot opens.
        </p>
        <a href={waitlistHref} style={formStyles.maintenanceCTA}>
          Join the waitlist
        </a>
        <p style={formStyles.maintenanceFinePrint}>
          Or email{' '}
          <a href="mailto:help@ptowl.com" style={formStyles.maintenanceLink}>
            help@ptowl.com
          </a>{' '}
          directly. Typical response within 24h.
        </p>
        <AuthFooterLink prefix="Already have an account?" linkText="Log In" to="/login" />
      </AuthCard>
    );
  }

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
  maintenanceCTA: {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '0.875rem 1.5rem',
    background: 'var(--green-mid)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    textAlign: 'center' as const,
    textDecoration: 'none',
    fontFamily: 'inherit',
    marginBottom: '0.75rem',
  },
  maintenanceFinePrint: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
    textAlign: 'center' as const,
    margin: 0,
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
};
