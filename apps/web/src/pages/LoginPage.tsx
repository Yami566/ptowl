import { useState, useEffect, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';
import { signInWithGoogle, signInWithEmail, sendPhoneCode, confirmPhoneCode, initRecaptcha, resetRecaptcha } from '../lib/firebase.js';
import type { ConfirmationResult } from 'firebase/auth';

/** Convert Firebase error codes to user-friendly messages */
function parseFirebaseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);

  // Extract Firebase error code from message like "Firebase: Error (auth/code-here)."
  const match = msg.match(/\(auth\/([^)]+)\)/);
  const code = match ? match[1] : '';

  switch (code) {
    case 'invalid-phone-number':
      return 'Invalid phone number. Please enter a valid US number (10 digits).';
    case 'too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'quota-exceeded':
      return 'SMS quota exceeded. Please try again later or use Google sign-in.';
    case 'captcha-check-failed':
      return 'Verification check failed. Please refresh the page and try again.';
    case 'internal-error':
      return 'Something went wrong. Please refresh the page and try again.';
    case 'popup-blocked':
      return 'Pop-up was blocked. Please allow pop-ups for this site and try again.';
    case 'popup-closed-by-user':
      return ''; // Not an error — user just closed the popup
    case 'network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'invalid-verification-code':
      return 'Incorrect code. Please check and try again.';
    case 'code-expired':
      return 'Code expired. Please request a new one.';
    case 'missing-phone-number':
      return 'Please enter your phone number.';
    case 'user-not-found':
    case 'wrong-password':
    case 'invalid-credential':
      return 'Invalid email or password.';
    case 'user-disabled':
      return 'This account has been disabled. Contact support.';
    case 'email-already-in-use':
      return 'An account with this email already exists.';
    case 'weak-password':
      return 'Password is too weak. Please use at least 8 characters.';
    case 'invalid-email':
      return 'Please enter a valid email address.';
    default:
      if (msg.includes('popup-closed-by-user')) return '';
      return msg || 'An unexpected error occurred. Please try again.';
  }
}

export function LoginPage() {
  const { user, loading: authLoading, loginWithFirebase, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  // Turnstile removed — Firebase handles bot protection for all auth methods

  // Initialize invisible reCAPTCHA for Firebase phone auth
  useEffect(() => {
    try {
      initRecaptcha('recaptcha-container');
    } catch (err) {
      console.error('reCAPTCHA init failed:', err);
      setError('Phone verification is temporarily unavailable. Please use Google sign-in or refresh the page.');
    }
  }, []);

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const idToken = await signInWithGoogle();
      const result = await loginWithFirebase(idToken);
      if (!result.ok) {
        setError(result.error || 'Google sign-in failed');
      }
    } catch (err) {
      const msg = parseFirebaseError(err);
      if (msg) setError(msg);
    }
    setLoading(false);
  };

  // Phone Sign-In — Step 1: Send code
  const handleSendPhoneCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await sendPhoneCode(phoneNumber);
      setConfirmationResult(result);
    } catch (err) {
      const msg = parseFirebaseError(err);
      setError(msg || 'Failed to send verification code');
      // Reset reCAPTCHA so user can retry
      resetRecaptcha();
      try { initRecaptcha('recaptcha-container'); } catch { /* ignore */ }
    }
    setLoading(false);
  };

  // Phone Sign-In — Step 2: Verify code
  const handleVerifyPhoneCode = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setError('');
    setLoading(true);
    try {
      const idToken = await confirmPhoneCode(confirmationResult, verificationCode);
      const result = await loginWithFirebase(idToken);
      if (!result.ok) {
        setError(result.error || 'Phone sign-in failed');
      }
    } catch (err) {
      const msg = parseFirebaseError(err);
      setError(msg || 'Invalid verification code');
    }
    setLoading(false);
  };

  // Email/password login via Firebase (same flow as Google/Phone)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // If already logged in as a different user, log out first
    if (user && user.email !== email.trim().toLowerCase()) {
      await logout();
    }

    try {
      const idToken = await signInWithEmail(email, password);
      const result = await loginWithFirebase(idToken);
      if (!result.ok) {
        setError(result.error || 'Email sign-in failed');
      }
    } catch (err) {
      const msg = parseFirebaseError(err);
      if (msg) setError(msg);
    }
    setLoading(false);
  };

  // While auth state is loading, show overlay (never show the form)
  if (authLoading) {
    return <LoadingOverlay message="Checking session..." />;
  }

  // If already logged in, show who they're logged in as (AuthContext will redirect shortly)
  if (user) {
    return (
      <main id="main-content" style={styles.page}>
        <div style={styles.center}>
          <div style={styles.brand}>
            <OwlLogo size="lg" linkTo="/login" />
          </div>
          <div style={styles.card}>
            <h1 style={styles.title}>Already signed in</h1>
            <p style={styles.subtitle}>Logged in as {user.email}</p>
            <button style={styles.button} onClick={() => logout()}>
              Sign in as a different user
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" style={styles.page}>
      {loading && <LoadingOverlay message="Signing in..." />}
      <div style={styles.center}>
        {/* Hero brand mark */}
        <div style={styles.brand}>
          <OwlLogo size="lg" />
        </div>

        <div style={styles.card}>
          <h1 style={styles.title}>Sign in</h1>
          <p style={styles.subtitle}>Fast schedule printing for medical providers</p>

          {error && <div style={styles.error}>{error}</div>}

          {/* Google Sign-In */}
          <button
            type="button"
            style={styles.googleButton}
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Phone Sign-In */}
          {!showPhoneInput ? (
            <button
              type="button"
              style={styles.phoneButton}
              onClick={() => setShowPhoneInput(true)}
              disabled={loading}
            >
              <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>&#x1F4F1;</span>
              <span>Continue with Phone</span>
            </button>
          ) : !confirmationResult ? (
            <form onSubmit={handleSendPhoneCode} style={styles.phoneForm}>
              <label style={styles.label}>
                Phone Number
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  style={styles.input}
                  placeholder="(555) 123-4567"
                  required
                  autoFocus
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--gray-text)' }}>US numbers only — we'll add +1 automatically</span>
              </label>
              <button type="submit" style={styles.button} disabled={loading}>
                {loading ? 'Sending...' : 'Send Code'}
              </button>
              <button
                type="button"
                style={styles.backLink}
                onClick={() => { setShowPhoneInput(false); setPhoneNumber(''); }}
              >
                Back
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyPhoneCode} style={styles.phoneForm}>
              <label style={styles.label}>
                Verification Code
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ ...styles.input, textAlign: 'center' as const, letterSpacing: '0.25rem', fontFamily: 'var(--font-mono)' }}
                  placeholder="123456"
                  maxLength={6}
                  required
                  autoFocus
                  inputMode="numeric"
                />
              </label>
              <button type="submit" style={styles.button} disabled={loading || verificationCode.length < 6}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
              <button
                type="button"
                style={styles.backLink}
                onClick={() => { setConfirmationResult(null); setVerificationCode(''); }}
              >
                Resend code
              </button>
            </form>
          )}

          {/* Invisible reCAPTCHA container for Firebase phone auth */}
          <div id="recaptcha-container" />

          {/* Divider */}
          <div style={styles.divider}>
            <span style={styles.dividerLine} />
            <span style={styles.dividerText}>or sign in with email</span>
            <span style={styles.dividerLine} />
          </div>

          {/* Email/password toggle (admin fallback) */}
          {!showEmailForm ? (
            <button
              type="button"
              style={styles.emailToggle}
              onClick={() => setShowEmailForm(true)}
            >
              Admin / Email Sign In
            </button>
          ) : (
            <>
              <form onSubmit={handleSubmit} style={styles.form}>
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

                <label style={styles.label}>
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={styles.input}
                    required
                    autoComplete="current-password"
                  />
                </label>

                <button type="submit" style={styles.button} disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>

              <p style={styles.forgot}>
                <Link to="/forgot-password">Forgot password?</Link>
              </p>
            </>
          )}

          <p style={styles.link}>
            <Link to="/privacy">Privacy</Link> &middot; <Link to="/terms">Terms</Link>
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
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
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
    background: 'var(--green-mid)',
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
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'var(--white)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 500,
    color: 'var(--dark)',
    width: '100%',
    cursor: 'pointer',
    marginBottom: '0.5rem',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  phoneButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    padding: '0.75rem',
    background: 'var(--white)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 500,
    color: 'var(--dark)',
    width: '100%',
    cursor: 'pointer',
    marginBottom: '0.5rem',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  phoneForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  backLink: {
    background: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.8rem',
    textDecoration: 'underline' as const,
    textAlign: 'center' as const,
    padding: '0.25rem',
    cursor: 'pointer',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '1rem 0',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    background: 'var(--gray-mid)',
  },
  dividerText: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    whiteSpace: 'nowrap' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  emailToggle: {
    background: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.875rem',
    textDecoration: 'underline' as const,
    width: '100%',
    textAlign: 'center' as const,
    padding: '0.5rem',
    cursor: 'pointer',
  },
  forgot: {
    textAlign: 'center' as const,
    marginTop: '1rem',
    fontSize: '0.875rem',
  },
  link: {
    textAlign: 'center' as const,
    marginTop: '1rem',
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
  },
};
