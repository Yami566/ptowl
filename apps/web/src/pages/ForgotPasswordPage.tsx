import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';
import { sendPasswordReset } from '../lib/firebase.js';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Firebase handles password reset emails directly — no custom backend needed
      await sendPasswordReset(email);
    } catch {
      // Silently ignore errors to prevent user enumeration
      // (Firebase may throw if email doesn't exist, but we don't reveal that)
    }

    // Always show success regardless of result (anti-enumeration)
    setSubmitted(true);
    setLoading(false);
  };

  // Success view
  if (submitted) {
    return (
      <main id="main-content" style={styles.page}>
        <div style={styles.center}>
          <div style={styles.brand}>
            <OwlLogo size="lg" linkTo="/login" />
          </div>
          <div style={styles.card}>
            <div style={styles.icon}>&#9993;</div>
            <h1 style={styles.title}>Check your email</h1>
            <p style={styles.text}>
              If that email is registered, you'll receive a reset link shortly.
              Check your inbox (and spam folder).
            </p>
            <Link to="/login" style={styles.linkBtn}>Back to Sign In</Link>
          </div>
        </div>
      </main>
    );
  }

  // Form view
  return (
    <main id="main-content" style={styles.page}>
      {loading && <LoadingOverlay message="Sending reset link..." />}
      <div style={styles.center}>
        <div style={styles.brand}>
          <OwlLogo size="lg" />
        </div>

        <div style={styles.card}>
          <h1 style={styles.title}>Reset password</h1>
          <p style={styles.subtitle}>Enter your email and we'll send you a reset link.</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.error}>{error}</div>}

            <label style={styles.label}>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                required
                autoFocus
                autoComplete="email"
              />
            </label>

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <p style={styles.link}>
            Remember your password? <Link to="/login">Sign in</Link>
          </p>
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
  icon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.25rem',
  },
  subtitle: {
    color: 'var(--gray-text)',
    fontSize: '0.875rem',
    marginBottom: '2rem',
  },
  text: {
    color: 'var(--gray-text)',
    lineHeight: 1.6,
    marginBottom: '1.5rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    textAlign: 'left' as const,
  },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--dark)',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    transition: 'border-color 0.15s',
  },
  button: {
    padding: '0.75rem',
    background: 'var(--orange-mid)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
  error: {
    background: 'var(--red-light)',
    color: 'var(--red-mid)',
    padding: '0.75rem',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
  },
  link: {
    textAlign: 'center' as const,
    marginTop: '1.5rem',
    fontSize: '0.875rem',
    color: 'var(--gray-text)',
  },
  linkBtn: {
    display: 'inline-block',
    padding: '0.75rem 1.5rem',
    background: 'var(--green-mid)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
  },
};
