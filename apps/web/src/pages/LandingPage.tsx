import { useState, useRef, useEffect } from 'react';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { apiRequest } from '../api/client.js';
import {
  sendPhoneCode,
  isMFAError,
  startMFASignIn,
  completeMFASignIn,
  type ConfirmationResult,
  type MultiFactorResolver,
} from '../firebase.js';

export function LandingPage() {
  usePageTitle('Log In');
  const { user, loading, login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'mfa'>('phone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaVerificationId, setMfaVerificationId] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const mfaInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus code input when step changes
  useEffect(() => {
    if (step === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    } else if (step === 'mfa' && mfaInputRef.current) {
      mfaInputRef.current.focus();
    }
  }, [step]);

  // Show loading while session restores — warm message for returning users
  if (loading) {
    return (
      <main style={{ ...styles.page, justifyContent: 'center', alignItems: 'center' }}>
        <OwlLogo size="lg" linkTo="/" />
        <p style={{ ...styles.subheadline, marginTop: '2rem' }}>Welcome back — restoring your session...</p>
      </main>
    );
  }

  // Already logged in — redirect handled by AuthContext
  if (user) return null;

  // Format phone for display: (XXX) XXX-XXXX
  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const handlePhoneChange = (val: string) => {
    setPhone(formatPhone(val));
    setError('');
  };

  const handleSendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a 10-digit phone number');
      return;
    }
    setSending(true);
    setError('');

    try {
      const e164 = `+1${digits}`;
      const result = await sendPhoneCode(e164, 'recaptcha-container');
      setConfirmationResult(result);
      setStep('code');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send code';
      if (msg.includes('too-many-requests')) {
        setError('Too many attempts. Please wait a few minutes.');
      } else if (msg.includes('invalid-phone-number')) {
        setError('Invalid phone number. Check and try again.');
      } else {
        setError('Failed to send code. Try again.');
      }
    }
    setSending(false);
  };

  const handleVerifyCode = async () => {
    if (code.length < 6) {
      setError('Enter the 6-digit code from your SMS');
      return;
    }
    if (!confirmationResult) {
      setError('Please request a new code');
      setStep('phone');
      return;
    }
    setSending(true);
    setError('');

    try {
      // Verify code with Firebase — returns a Firebase user
      const credential = await confirmationResult.confirm(code);
      await exchangeTokenWithBackend(credential.user);
    } catch (err: unknown) {
      // MFA required — Firebase throws a special error
      if (isMFAError(err)) {
        try {
          const { resolver, verificationId } = await startMFASignIn(err, 'recaptcha-container');
          setMfaResolver(resolver);
          setMfaVerificationId(verificationId);
          setStep('mfa');
        } catch {
          setError('Failed to send MFA code. Try again.');
        }
        setSending(false);
        return;
      }

      const msg = err instanceof Error ? err.message : 'Invalid code';
      if (msg.includes('invalid-verification-code')) {
        setError('Invalid code. Check and try again.');
      } else if (msg.includes('code-expired')) {
        setError('Code expired. Request a new one.');
      } else {
        setError('Verification failed. Try again.');
      }
    }
    setSending(false);
  };

  const handleMfaVerify = async () => {
    if (mfaCode.length < 6) {
      setError('Enter the 6-digit MFA code');
      return;
    }
    if (!mfaResolver || !mfaVerificationId) {
      setError('Please start over');
      setStep('phone');
      return;
    }
    setSending(true);
    setError('');

    try {
      const userCredential = await completeMFASignIn(mfaResolver, mfaVerificationId, mfaCode);
      await exchangeTokenWithBackend(userCredential.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code';
      if (msg.includes('invalid-verification-code')) {
        setError('Invalid MFA code. Check and try again.');
      } else {
        setError('MFA verification failed. Try again.');
      }
    }
    setSending(false);
  };

  /** Exchange a Firebase user's ID token for our backend session */
  const exchangeTokenWithBackend = async (firebaseUser: { getIdToken: () => Promise<string> }) => {
    const idToken = await firebaseUser.getIdToken();
    const result = await apiRequest<{ user: { id: string; email: string; phone: string; display_name: string; role: string; tier: string }; csrfToken: string; isNewUser: boolean }>('/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({ idToken, rememberMe }),
    });

    if (result.ok && result.data) {
      login(result.data.user, result.data.csrfToken);
    } else {
      setError(result.error?.message || 'Authentication failed');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') action();
  };

  return (
    <main style={styles.page}>
      {/* Hero */}
      <section style={styles.hero} className="landing-fade-in">
        <OwlLogo size="lg" linkTo="/" />
        <h1 style={styles.headline}>The fastest PT schedule generator on earth.</h1>
        <p style={styles.subheadline}>
          Create and print patient schedules in under <strong>5 keypresses</strong>.
          Built for physical therapists who value speed over clicks.
        </p>

        {/* Phone Auth — clean, single-flow like Uber/WhatsApp */}
        <div style={styles.authCard}>
          {step === 'mfa' ? (
            <>
              <div style={styles.stepBadge}>Security check</div>
              <h2 style={styles.authTitle}>MFA verification</h2>
              <p style={styles.authSubtitle}>Enter the 6-digit code from your authenticator app.</p>
              <label htmlFor="mfa-input" className="sr-only">MFA code</label>
              <input
                id="mfa-input"
                ref={mfaInputRef}
                type="text"
                inputMode="numeric"
                value={mfaCode}
                onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                onKeyDown={(e) => handleKeyDown(e, handleMfaVerify)}
                placeholder="000000"
                style={styles.codeInput}
                maxLength={6}
                autoComplete="one-time-code"
              />
              <button
                style={{ ...styles.authBtn, opacity: sending ? 0.6 : 1 }}
                onClick={handleMfaVerify}
                disabled={sending}
              >
                {sending ? 'Verifying...' : 'Verify'}
              </button>
              <button
                style={styles.backBtn}
                onClick={() => { setStep('phone'); setMfaCode(''); setError(''); setMfaResolver(null); }}
              >
                Start over
              </button>
            </>
          ) : step === 'phone' ? (
            <>
              <div style={styles.stepBadge}>Step 1 of 2</div>
              <h2 style={styles.authTitle}>Enter your phone number</h2>
              <p style={styles.authSubtitle}>
                New here? We'll create your account.<br />
                Already registered? We'll log you right in.
              </p>
              <label htmlFor="phone-input" className="sr-only">Phone number</label>
              <div style={styles.phoneRow}>
                <span style={styles.countryCode}>+1</span>
                <input
                  id="phone-input"
                  type="tel"
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleSendCode)}
                  placeholder="(555) 123-4567"
                  style={styles.phoneInput}
                  autoFocus
                  autoComplete="tel"
                />
              </div>
              <button
                style={{ ...styles.authBtn, opacity: sending ? 0.6 : 1 }}
                onClick={handleSendCode}
                disabled={sending}
              >
                {sending ? 'Sending code...' : 'Continue'}
              </button>
              <label style={styles.rememberRow}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={styles.rememberCheck}
                />
                <span style={styles.rememberText}>Keep me signed in for 14 days</span>
              </label>
              <p style={styles.authFootnote}>We'll text you a verification code. Standard rates apply.</p>
            </>
          ) : (
            <>
              <div style={styles.stepBadge}>Step 2 of 2</div>
              <h2 style={styles.authTitle}>Verify your number</h2>
              <p style={styles.authSubtitle}>
                We sent a 6-digit code to <strong>{phone}</strong>
              </p>
              <label htmlFor="code-input" className="sr-only">Verification code</label>
              <input
                id="code-input"
                ref={codeInputRef}
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }}
                onKeyDown={(e) => handleKeyDown(e, handleVerifyCode)}
                placeholder="000000"
                style={styles.codeInput}
                maxLength={6}
                autoComplete="one-time-code"
              />
              <button
                style={{ ...styles.authBtn, opacity: sending ? 0.6 : 1 }}
                onClick={handleVerifyCode}
                disabled={sending}
              >
                {sending ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <button
                style={styles.backBtn}
                onClick={() => { setStep('phone'); setCode(''); setError(''); setConfirmationResult(null); }}
              >
                Use a different number
              </button>
            </>
          )}
          <p style={{ ...styles.authError, visibility: error ? 'visible' : 'hidden', margin: error ? undefined : 0 }} aria-live="assertive" role="alert">
            {error ? `Error: ${error}` : '\u00A0'}
          </p>
          <div id="recaptcha-container" />
        </div>
      </section>

      {/* How it works */}
      <section style={styles.howSection} className="landing-fade-in landing-fade-in-delay-1">
        <h2 style={styles.sectionTitle}>4 keypresses. That's it. <span style={{ opacity: 0.55, fontWeight: 400, fontStyle: 'italic' }}>Okay, maybe five.</span></h2>
        <div style={styles.steps}>
          <div style={styles.step}>
            <span style={styles.key} className="key-animate">1</span>
            <p style={styles.stepText}>Pick a template</p>
          </div>
          <span style={styles.arrow}>&rarr;</span>
          <div style={styles.step}>
            <span style={styles.key} className="key-animate">AB</span>
            <p style={styles.stepText}>Patient initials</p>
          </div>
          <span style={styles.arrow}>&rarr;</span>
          <div style={styles.step}>
            <span style={styles.key} className="key-animate">&#9166;</span>
            <p style={styles.stepText}>Generate</p>
          </div>
          <span style={styles.arrow}>&rarr;</span>
          <div style={styles.step}>
            <span style={styles.key} className="key-animate">P</span>
            <p style={styles.stepText}>Print</p>
          </div>
          <span style={{ ...styles.arrow, opacity: 0.4 }}>&rarr;</span>
          <div style={styles.step}>
            <span style={{ ...styles.key, borderStyle: 'dashed', opacity: 0.55, transform: 'rotate(-2deg)' }} className="key-animate">&#9749;</span>
            <p style={{ ...styles.stepText, fontStyle: 'italic' }}>Sip coffee</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={styles.features} className="landing-fade-in landing-fade-in-delay-2">
        <div style={styles.featureCard} className="feature-card-hover">
          <div style={styles.featureIcon}>&#129668;</div>
          <h3 style={styles.featureTitle}>You're the wizard here</h3>
          <p style={styles.featureDesc}>
            Make your own templates, use premade templates, switch your layout!
            Hotkeys, drag-and-drop, full control — your clinic runs your way.
          </p>
        </div>
        <div style={styles.featureCard} className="feature-card-hover">
          <div style={styles.featureIcon}><span className="bee-container" role="img" aria-label="buzzing bee">&#128029;</span></div>
          <h3 style={styles.featureTitle}>Schedulize your life</h3>
          <p style={styles.featureDesc}>
            Because life is a bee.. buzzing from patient to patient,
            appointment to appointment. Let us handle the hive.
          </p>
        </div>
        <div style={styles.featureCard} className="feature-card-hover">
          <div style={styles.featureIcon}>&#129300;</div>
          <h3 style={styles.featureTitle}>Who?</h3>
          <p style={styles.featureDesc}>
            Stop stressing, this is just a game.. patient names become
            championship legends on screen. Your data stays invisible.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer} className="landing-fade-in landing-fade-in-delay-3">
        <OwlLogo size="sm" linkTo="/" />
        <div style={styles.footerLinks}>
          <a href="/privacy" style={styles.footerLink}>Privacy</a>
          <a href="/terms" style={styles.footerLink}>Terms</a>
          <a href="/security" style={styles.footerLink}>Security</a>
        </div>
        <p style={styles.footerCopy}>&copy; 2026 PT OWL. All rights reserved.</p>
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, var(--green-bg) 0%, #ffffff 40%)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  hero: {
    textAlign: 'center' as const,
    padding: '5rem 1.5rem 3rem',
    maxWidth: '640px',
    margin: '0 auto',
  },
  headline: {
    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
    fontWeight: 800,
    color: 'var(--dark)',
    lineHeight: 1.15,
    margin: '1.5rem 0 1rem',
  },
  subheadline: {
    fontSize: '1.1rem',
    color: 'var(--gray-text)',
    lineHeight: 1.6,
    marginBottom: '2.5rem',
  },

  // Phone Auth Card
  authCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid var(--green-bg)',
    maxWidth: '380px',
    margin: '0 auto',
  },
  authTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.25rem',
    textAlign: 'center' as const,
  },
  authSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
    marginBottom: '1.25rem',
    textAlign: 'center' as const,
    lineHeight: 1.4,
  },
  stepBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    background: 'var(--green-bg)',
    color: 'var(--green-dark)',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.02em',
    marginBottom: '0.75rem',
  },
  rememberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.75rem',
    cursor: 'pointer',
    justifyContent: 'center',
  },
  rememberCheck: {
    width: '16px',
    height: '16px',
    accentColor: 'var(--green-mid)',
    cursor: 'pointer',
  },
  rememberText: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
  },
  authFootnote: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    opacity: 0.7,
    marginTop: '0.5rem',
    textAlign: 'center' as const,
  },
  phoneRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  countryCode: {
    padding: '0.875rem 0.75rem',
    background: 'var(--gray-light)',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
    fontSize: '1rem',
    color: 'var(--dark)',
  },
  phoneInput: {
    flex: 1,
    padding: '0.875rem',
    fontSize: '1.1rem',
    fontFamily: 'var(--font-mono)',
    border: '2px solid var(--green-mid)',
    borderRadius: 'var(--radius)',
    outline: 'none',
  },
  codeInput: {
    width: '100%',
    padding: '1rem',
    fontSize: '2rem',
    textAlign: 'center' as const,
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    letterSpacing: '0.75rem',
    border: '2px solid var(--green-mid)',
    borderRadius: 'var(--radius)',
    outline: 'none',
    marginBottom: '1rem',
    boxSizing: 'border-box' as const,
  },
  authBtn: {
    width: '100%',
    padding: '0.875rem',
    background: 'var(--green-mid)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '1.05rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  backBtn: {
    width: '100%',
    padding: '0.75rem 1rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.85rem',
    cursor: 'pointer',
    marginTop: '0.75rem',
  },
  authError: {
    color: 'var(--red-mid)',
    fontSize: '0.85rem',
    marginTop: '0.75rem',
  },

  // How it works
  howSection: {
    textAlign: 'center' as const,
    padding: '3rem 1.5rem',
    maxWidth: '720px',
    margin: '0 auto',
  },
  sectionTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '2rem',
  },
  steps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
  },
  step: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem',
  },
  key: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '3.5rem',
    height: '3.5rem',
    background: 'var(--white)',
    border: '2px solid var(--green-mid)',
    borderRadius: '10px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '1rem',
    color: 'var(--green-dark)',
    boxShadow: '0 3px 0 var(--green-mid)',
  },
  stepText: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
    fontWeight: 500,
  },
  arrow: {
    fontSize: '1.5rem',
    color: 'var(--green-mid)',
    fontWeight: 700,
    marginBottom: '1.5rem',
  },

  // Features
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
    maxWidth: '900px',
    margin: '0 auto',
    padding: '2rem 1.5rem 4rem',
  },
  featureCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid var(--green-bg)',
    textAlign: 'center' as const,
  },
  featureIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.75rem',
  },
  featureTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.5rem',
  },
  featureDesc: {
    fontSize: '0.9rem',
    color: 'var(--gray-text)',
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    marginTop: 'auto',
    textAlign: 'center' as const,
    padding: '2rem 1.5rem',
    borderTop: '1px solid var(--green-bg)',
    background: 'var(--green-bg-footer)',
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1.5rem',
    margin: '1rem 0',
  },
  footerLink: {
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
    textDecoration: 'none',
    padding: '0.5rem 0.75rem',
    display: 'inline-block',
  },
  footerCopy: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    opacity: 0.6,
  },
};
