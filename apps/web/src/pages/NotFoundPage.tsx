import { Link } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export function NotFoundPage() {
  usePageTitle('Page Not Found');
  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.center}>
        <div style={styles.brand}>
          <OwlLogo size="lg" linkTo="/" />
        </div>

        <div style={styles.card} className="ptowl-center-card">
          <h1 style={styles.code}>404</h1>
          <p style={styles.title}>Page Not Found</p>
          <p style={styles.message}>
            Even owls with 270° vision can't spot this page.
            It may have been moved, removed, or never existed.
          </p>

          <Link to="/dashboard" style={styles.button}>
            Back to Dashboard
          </Link>
        </div>
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
    background: 'var(--off-white)',
    padding: '1rem',
  },
  center: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '100%',
    maxWidth: '420px',
  },
  brand: {
    marginBottom: '2rem',
  },
  card: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    textAlign: 'center' as const,
  },
  code: {
    fontSize: '4rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--orange-mid)',
    lineHeight: 1,
    marginBottom: '0.25rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.75rem',
  },
  message: {
    color: 'var(--gray-text)',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    marginBottom: '2rem',
  },
  button: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    background: 'var(--green-mid)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    textDecoration: 'none',
  },
};
