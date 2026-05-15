import { useState } from 'react';
import { useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { apiRequest } from '../api/client.js';

/**
 * AwaitingApprovalPage — shown after a new clinic signs up while their
 * status is 'pending'. AuthContext routes users here when /auth/me
 * returns the PENDING_APPROVAL error code (apps/api/src/middleware/auth.ts).
 *
 * Two affordances:
 *
 *   • Check status — re-fetch /auth/me. If the founder has approved
 *     in the meantime, the user lands on /dashboard without a full
 *     reload.
 *   • Sign out — destroy the Clerk session and head back to the
 *     landing page.
 *
 * Companion pages: docs/AUTH-LIFECYCLE.md §21 (Stage F wireframe).
 */
export function AwaitingApprovalPage() {
  usePageTitle('Awaiting approval');
  const clerk = useClerk();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [stillPending, setStillPending] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    setStillPending(false);
    const result = await apiRequest('/auth/me');
    if (result.ok && result.data) {
      // Approved! AuthContext picks this up on next mount; we hard-
      // reload to refresh the whole app state cleanly.
      window.location.assign('/dashboard');
      return;
    }
    setStillPending(true);
    setChecking(false);
  };

  const handleSignOut = async () => {
    await clerk.signOut().catch(() => {});
    navigate('/', { replace: true });
  };

  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.card} role="status">
        <OwlLogo size="md" linkTo="/" />
        <h1 style={styles.title}>Almost there, Doctor.</h1>
        <p style={styles.body}>
          Thanks for signing up. Your account is being reviewed by the PTOwl team.
        </p>
        <p style={styles.body}>
          We approve new clinics within 24 hours. You&apos;ll get an email at your sign-up address
          once you&apos;re in.
        </p>
        <p style={styles.helpLine}>
          Questions?{' '}
          <a href="mailto:help@ptowl.com" style={styles.helpLink}>
            help@ptowl.com
          </a>
        </p>
        <button type="button" onClick={handleSignOut} style={styles.signOutBtn}>
          Sign out
        </button>
        <button
          type="button"
          onClick={handleCheckStatus}
          disabled={checking}
          style={styles.checkLink}
        >
          {checking ? 'Checking…' : 'Check status'}
        </button>
        {stillPending && (
          <p style={styles.stillPending} role="alert">
            Still pending. We&apos;ll email you the moment it changes.
          </p>
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem 1rem',
    background: 'var(--off-white)',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem 1.75rem',
    boxShadow: '0 8px 32px rgba(15, 32, 39, 0.08)',
    border: '1px solid var(--gray-light)',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 600,
    color: 'var(--dark)',
    margin: '0.5rem 0 0',
  },
  body: {
    fontSize: '0.95rem',
    color: 'var(--gray-text)',
    margin: 0,
    lineHeight: 1.55,
  },
  helpLine: {
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
    margin: '0.25rem 0',
  },
  helpLink: {
    color: 'var(--green-dark)',
    fontWeight: 600,
    textDecoration: 'none',
  },
  signOutBtn: {
    marginTop: '0.5rem',
    width: '100%',
    minHeight: '44px',
    padding: '0.75rem 1rem',
    background: 'transparent',
    color: 'var(--gray-text)',
    border: '1px solid var(--gray-light)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  checkLink: {
    marginTop: '-0.25rem',
    background: 'transparent',
    color: 'var(--green-dark)',
    border: 'none',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  stillPending: {
    margin: 0,
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
    fontStyle: 'italic' as const,
  },
};
