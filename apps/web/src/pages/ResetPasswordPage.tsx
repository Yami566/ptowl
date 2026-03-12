import { Link } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';

// Password reset is now handled entirely by Firebase.
// This page exists only as a catch-all for any old bookmarks or stale links.
export function ResetPasswordPage() {
  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.center}>
        <div style={styles.brand}>
          <OwlLogo size="lg" linkTo="/login" />
        </div>
        <div style={styles.card}>
          <h1 style={styles.title}>Password Reset</h1>
          <p style={styles.text}>
            Password resets are now handled securely through our authentication provider.
            Please use the "Forgot Password" link on the login page to receive a new reset email.
          </p>
          <Link to="/forgot-password" style={styles.linkBtn}>Go to Forgot Password</Link>
          <p style={styles.link}>
            <Link to="/login">Back to Sign In</Link>
          </p>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--off-white)', padding: '1rem' },
  center: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', width: '100%', maxWidth: '420px' },
  brand: { marginBottom: '2rem' },
  card: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', width: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center' as const },
  title: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.5rem' },
  text: { color: 'var(--gray-text)', lineHeight: 1.6, marginBottom: '1.5rem' },
  linkBtn: { display: 'inline-block', padding: '0.75rem 1.5rem', background: 'var(--green-mid)', color: 'white', textDecoration: 'none', borderRadius: 'var(--radius)', fontWeight: 600 },
  link: { textAlign: 'center' as const, marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--gray-text)' },
};
