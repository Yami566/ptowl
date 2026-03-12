import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';
import { registerWithEmail } from '../lib/firebase.js';

/** Convert Firebase error codes to user-friendly messages */
function parseFirebaseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/\(auth\/([^)]+)\)/);
  const code = match ? match[1] : '';

  switch (code) {
    case 'email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'invalid-email':
      return 'Please enter a valid email address.';
    case 'weak-password':
      return 'Password is too weak. Use at least 8 characters with uppercase, lowercase, and a digit.';
    case 'too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return msg || 'Registration failed. Please try again.';
  }
}

export function RegisterPage() {
  const { loginWithFirebase } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create Firebase account (Firebase handles email/password validation)
      const idToken = await registerWithEmail(email, password, displayName);

      // Exchange Firebase token for PTOWL session (creates DB user with 'pending' status)
      const result = await loginWithFirebase(idToken, displayName);
      if (result.ok) {
        navigate('/pending');
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (err) {
      setError(parseFirebaseError(err));
    }
    setLoading(false);
  };

  return (
    <main id="main-content" style={styles.page}>
      {loading && <LoadingOverlay message="Creating account..." />}
      <div style={styles.center}>
        {/* Hero brand mark */}
        <div style={styles.brand}>
          <OwlLogo size="lg" linkTo="/login" />
        </div>

        <div style={styles.card}>
          <h1 style={styles.title}>Create your account</h1>
          <p style={styles.subtitle}>Join PTOWL to start printing schedules</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <label style={styles.label}>
            Display Name (optional)
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={styles.input}
              placeholder="How you want to be called"
              maxLength={50}
            />
          </label>

          <label style={styles.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
              autoComplete="email"
            />
          </label>

          <label style={styles.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <span style={styles.hint}>Min 8 chars, 1 uppercase, 1 lowercase, 1 digit</span>
          </label>

          <button type="submit" style={styles.button} disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={styles.link}>
          Already have an account? <Link to="/login">Sign in</Link>
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
  card: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', width: '100%', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  title: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' },
  subtitle: { color: 'var(--gray-text)', fontSize: '0.875rem', marginBottom: '2rem' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  label: { display: 'flex', flexDirection: 'column' as const, gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500, color: 'var(--dark)' },
  input: { padding: '0.75rem', border: '1px solid var(--gray-mid)', borderRadius: 'var(--radius)', fontSize: '1rem' },
  hint: { fontSize: '0.75rem', color: 'var(--gray-text)' },
  button: { padding: '0.75rem', background: 'var(--green-mid)', color: 'white', borderRadius: 'var(--radius)', fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem' },
  error: { background: 'var(--red-light)', color: 'var(--red-mid)', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.875rem' },
  link: { textAlign: 'center' as const, marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--gray-text)' },
};
