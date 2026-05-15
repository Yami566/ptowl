/**
 * AuthWidget — two CTAs on the landing page, modeled on betraiders.net.
 *
 * Orange primary "Log In" → /login (returning users, common path).
 * Dark secondary "Sign Up" → /signup (new clinics, less common path).
 *
 * Both lead to PTOwl-rendered custom forms backed by Clerk's `useSignIn` /
 * `useSignUp` hooks (apps/web/src/pages/LoginPage.tsx + SignUpPage.tsx).
 * No vendor-widget cross-browser surface; same code path that works on
 * betraiders.
 */
export function AuthWidget() {
  return (
    <div role="region" aria-label="Sign-in" style={styles.row}>
      <a href="/login" style={styles.primary}>
        Log In
      </a>
      <a href="/signup" style={styles.secondary}>
        Sign Up
      </a>
      <p style={styles.trust}>Free during beta · No credit card · No PHI stored</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.75rem',
    justifyContent: 'center',
    width: '100%',
    maxWidth: '320px',
    margin: '0 auto',
  },
  primary: {
    flex: '1 1 140px',
    padding: '0.875rem 1.5rem',
    background: 'var(--orange-mid)',
    color: 'var(--white)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    textDecoration: 'none',
    textAlign: 'center' as const,
    minHeight: '48px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    flex: '1 1 140px',
    padding: '0.875rem 1.5rem',
    background: 'var(--white)',
    color: 'var(--green-dark)',
    border: '1.5px solid var(--green-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    textDecoration: 'none',
    textAlign: 'center' as const,
    minHeight: '48px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trust: {
    flexBasis: '100%',
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    textAlign: 'center' as const,
    marginTop: '0.25rem',
    lineHeight: 1.5,
  },
};
