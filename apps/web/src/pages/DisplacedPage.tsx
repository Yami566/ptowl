import { Link } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

/**
 * DisplacedPage — shown when Clerk's single-session-mode invalidated
 * this device's session because the user signed in on a different
 * device. AuthContext routes here when `isSignedIn` flips true → false
 * WITHOUT an explicit logout call (typical signal for kick or expiry).
 *
 * Wireframe matches docs/AUTH-LIFECYCLE.md §23 (Stage L):
 *
 *   • Friendly explanation (this is a security feature, not a bug)
 *   • Primary "Sign in here again" — gets the user back online if
 *     they wanted to switch back
 *   • "Wasn't you? Change your password" — quick escape hatch for
 *     credential-theft scenarios; routes through Clerk's hosted
 *     account portal so the user gets the password reset flow
 *
 * Public route — no Clerk session required since they don't have one
 * by definition when they land here.
 */
export function DisplacedPage() {
  usePageTitle('You signed in on another device');

  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.card} role="status">
        <OwlLogo size="md" linkTo="/" />
        <h1 style={styles.title}>You signed in on another device.</h1>
        <p style={styles.body}>
          For security, PTOwl keeps only one session active at a time. The other device is now the
          active one.
        </p>
        <p style={styles.body}>
          If you meant to sign back in here, the button below will take you to sign-in. The other
          device will then be signed out.
        </p>
        <Link to="/accounts/signin" style={styles.primary}>
          Sign in here again
        </Link>
        <a
          href="https://accounts.ptowl.com/user/password"
          rel="noopener"
          style={styles.secondaryLink}
        >
          Wasn&apos;t you? Change your password.
        </a>
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
    maxWidth: '440px',
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
    lineHeight: 1.3,
  },
  body: {
    fontSize: '0.95rem',
    color: 'var(--gray-text)',
    margin: 0,
    lineHeight: 1.55,
  },
  primary: {
    width: '100%',
    minHeight: '48px',
    marginTop: '0.5rem',
    padding: '0.875rem 1.25rem',
    background: 'var(--orange-mid)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLink: {
    marginTop: '-0.25rem',
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
    textDecoration: 'underline',
  },
};
