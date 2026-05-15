import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { apiRequest } from '../api/client.js';

/**
 * AdminDecidePage — public landing for the founder's magic-link
 * approval emails. Reads `token` + `decision` from the URL, posts
 * them to the API, and renders the confirmation.
 *
 * No Clerk auth required: the JWT in the URL IS the authentication
 * (signed with JWT_SECRET on the API side, see
 * apps/api/src/routes/admin.ts).
 *
 * Wireframe in docs/AUTH-LIFECYCLE.md §38.
 */

type State =
  | { kind: 'loading' }
  | { kind: 'success'; decision: 'approve' | 'deny'; userEmail: string }
  | { kind: 'already'; decision: 'approve' | 'deny'; userEmail: string }
  | { kind: 'error'; message: string };

export function AdminDecidePage() {
  usePageTitle('Confirm decision');
  const [params] = useSearchParams();
  const [state, setState] = useState<State>({ kind: 'loading' });

  const token = params.get('token') || '';
  const rawDecision = params.get('decision');
  const decision: 'approve' | 'deny' | null =
    rawDecision === 'approve' || rawDecision === 'deny' ? rawDecision : null;

  useEffect(() => {
    if (!token || !decision) {
      setState({ kind: 'error', message: 'Missing or invalid link.' });
      return;
    }
    let cancelled = false;
    (async () => {
      const result = await apiRequest<{
        decision: 'approve' | 'deny';
        user_email: string;
        previously?: string;
      }>('/admin/decide', {
        method: 'POST',
        body: JSON.stringify({ token, decision }),
      });
      if (cancelled) return;
      if (result.ok && result.data) {
        const userEmail = result.data.user_email || '';
        if (result.data.previously?.startsWith('already-')) {
          setState({ kind: 'already', decision, userEmail });
        } else {
          setState({ kind: 'success', decision, userEmail });
        }
      } else {
        const code = result.error?.code;
        const message =
          code === 'UNAUTHORIZED'
            ? 'This link has expired or already been used.'
            : code === 'TIMEOUT' || code === 'NETWORK_ERROR'
              ? 'Network error. Try the link again in a minute.'
              : result.error?.message || 'Request failed.';
        setState({ kind: 'error', message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, decision]);

  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.card} role="status">
        <OwlLogo size="md" linkTo="/" />
        {state.kind === 'loading' && (
          <>
            <h1 style={styles.title}>Working…</h1>
            <p style={styles.body}>Recording your decision.</p>
          </>
        )}
        {state.kind === 'success' && (
          <>
            <h1 style={styles.title}>{state.decision === 'approve' ? '✓ Approved' : '✗ Denied'}</h1>
            <p style={styles.body}>
              {state.userEmail} has been {state.decision === 'approve' ? 'approved' : 'denied'}.{' '}
              {state.decision === 'approve'
                ? 'They can sign in now and we just emailed them.'
                : 'We just emailed them gently.'}
            </p>
          </>
        )}
        {state.kind === 'already' && (
          <>
            <h1 style={styles.title}>Already done</h1>
            <p style={styles.body}>
              {state.userEmail} was already {state.decision === 'approve' ? 'approved' : 'denied'}.
              No action taken.
            </p>
          </>
        )}
        {state.kind === 'error' && (
          <>
            <h1 style={styles.titleError}>Couldn&apos;t record decision</h1>
            <p style={styles.body}>{state.message}</p>
          </>
        )}
        <Link to="/" style={styles.backLink}>
          ← Back to PTOwl
        </Link>
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
    gap: '0.75rem',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 600,
    color: 'var(--green-dark)',
    margin: '0.5rem 0 0',
  },
  titleError: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'var(--orange-mid)',
    margin: '0.5rem 0 0',
  },
  body: {
    fontSize: '0.95rem',
    color: 'var(--gray-text)',
    margin: 0,
    lineHeight: 1.55,
  },
  backLink: {
    marginTop: '0.75rem',
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
    textDecoration: 'none',
  },
};
