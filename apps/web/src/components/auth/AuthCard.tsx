import type { ReactNode } from 'react';

/**
 * AuthCard — centered card layout used by Login / SignUp / Awaiting-approval.
 *
 * One-job-per-page layout (modeled on betraiders.net): centered ~360px card,
 * brand wordmark + subtitle at top, slotted body, optional footer link.
 * Dark background so the card itself is the focus.
 *
 * Composes:
 *   <AuthCard title="Welcome back" subtitle="Sign in to print schedules">
 *     {form fields}
 *     <SubmitButton>Log In</SubmitButton>
 *     <AuthFooterLink ... />
 *   </AuthCard>
 */
interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    // id="main-content" pairs with the skip-to-main link in App.tsx so
    // keyboard users can jump past the chrome to the form. Pre-this-fix
    // the <main> was here but unaddressable — the skip link had no
    // target on auth pages. Caught by e2e-live's mode-tolerant check
    // on /login + /signup maintenance cards 2026-05-18.
    <main id="main-content" style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.wordmark}>
            <span style={styles.owl} aria-hidden="true">
              🦉
            </span>
            <span style={styles.brand}>PTOwl</span>
          </div>
          <h1 style={styles.title}>{title}</h1>
          {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
        </div>
        <div style={styles.body}>{children}</div>
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
    maxWidth: '380px',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem 1.5rem',
    boxShadow: '0 8px 32px rgba(15, 32, 39, 0.08)',
    border: '1px solid var(--gray-light)',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '1.5rem',
  },
  wordmark: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  owl: {
    fontSize: '2rem',
    lineHeight: 1,
  },
  brand: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--green-dark)',
    letterSpacing: '0.02em',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'var(--dark)',
    margin: 0,
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--gray-text)',
    margin: 0,
  },
  body: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
};
