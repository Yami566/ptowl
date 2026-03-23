import { useState, useRef, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { OwlScene } from '../components/OwlScene.js';
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

// Lazy-load FullCalendar for demo section
const LazyFullCalendar = lazy(() => import('@fullcalendar/react'));
const dayGridPromise = import('@fullcalendar/daygrid');

/** Generate sample Mon/Wed/Fri PT events for the current month */
function generateSampleEvents() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = new Date(year, month, now.getDate());
  const events: Array<{ title: string; date: string; color: string }> = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay();
    // Mon=1, Wed=3, Fri=5
    if (dow === 1 || dow === 3 || dow === 5) {
      const iso = date.toISOString().split('T')[0]!;
      events.push({
        title: 'PT Session',
        date: iso,
        color: date < today ? 'var(--green-mid)' : 'var(--orange-mid)',
      });
    }
  }
  return events;
}

function DemoCalendarSection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [dayGridPlugin, setDayGridPlugin] = useState<any>(null);
  const sampleEvents = useMemo(() => generateSampleEvents(), []);

  useEffect(() => {
    dayGridPromise.then((m) => setDayGridPlugin(m.default));
  }, []);

  if (!dayGridPlugin) return <div style={{ minHeight: '300px' }} />;

  return (
    <Suspense fallback={<div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-text)' }}>Loading calendar...</div>}>
      <LazyFullCalendar
        plugins={[dayGridPlugin]}
        initialView="dayGridMonth"
        events={sampleEvents}
        headerToolbar={{ left: '', center: 'title', right: '' }}
        height="auto"
        editable={false}
        selectable={false}
        dayMaxEvents={2}
      />
    </Suspense>
  );
}

export function LandingPage() {
  usePageTitle('Log In');
  const { user, loading, login } = useAuth();
  const [userType, setUserType] = useState<'clinic' | 'patient'>('clinic');
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
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const mfaInputRef = useRef<HTMLInputElement>(null);
  const [alienActive, setAlienActive] = useState(false);
  const alienTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Alien easter egg — triggers when user highlights "until the aliens come."
  const handleAlienSelect = useCallback(() => {
    const sel = window.getSelection()?.toString().trim().toLowerCase();
    if (sel && sel.includes('until the aliens come')) {
      if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
      setAlienActive(true);
      alienTimeoutRef.current = setTimeout(() => setAlienActive(false), 4000);
    }
  }, []);

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
      body: JSON.stringify({ idToken, rememberMe, user_type: userType }),
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
      <section style={styles.hero} className="landing-fade-in landing-hero">
        <OwlScene size="hero" />
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <OwlLogo size="lg" linkTo="/" />
          {alienActive && (
            <div className="alien-easter-egg" aria-hidden="true">
              <span className="alien-ufo">&#128760;</span>
              <span className="alien-beam" />
              <span className="alien-cow">&#128004;</span>
            </div>
          )}
        </div>
        <h1 style={styles.headline}>The fastest schedule assistant on earth.</h1>
        <p
          style={styles.alienSubtext}
          onMouseUp={handleAlienSelect}
          onTouchEnd={handleAlienSelect}
        >until the aliens come.</p>
        <p style={styles.subheadline}>
          Create and print patient schedules in under <strong>5 keypresses</strong>.
          Built for physical therapists who value speed over clicks.
        </p>

        {/* Phone Auth — clean, single-flow like Uber/WhatsApp */}
        <div style={styles.authCard} className="landing-auth-card">
          {step === 'mfa' ? (
            <>
              <div style={styles.stepBadge}>Security check</div>
              <h2 style={styles.authTitle}>MFA verification</h2>
              <p style={styles.authSubtitle}>Enter the 6-digit code texted to your phone.</p>
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
              {/* User type selector */}
              <div style={styles.userTypeRow}>
                <button
                  style={{ ...styles.userTypeBtn, ...(userType === 'clinic' ? styles.userTypeBtnActive : {}) }}
                  onClick={() => setUserType('clinic')}
                >I'm a Provider</button>
                <button
                  style={{ ...styles.userTypeBtn, ...(userType === 'patient' ? styles.userTypeBtnActive : {}) }}
                  onClick={() => setUserType('patient')}
                >I'm a Patient</button>
              </div>
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
              <label style={styles.termsRow}>
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  style={styles.rememberCheck}
                />
                <span style={styles.termsText}>
                  I agree to the <a href="/terms" target="_blank" style={{ color: 'var(--green-mid)' }}>Terms of Service</a> and <a href="/privacy" target="_blank" style={{ color: 'var(--green-mid)' }}>Privacy Policy</a>
                </span>
              </label>
              <button
                style={{ ...styles.authBtn, opacity: (sending || !agreedToTerms) ? 0.6 : 1 }}
                onClick={handleSendCode}
                disabled={sending || !agreedToTerms}
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

      {/* Demo Calendar */}
      <section style={styles.demoSection} className="landing-fade-in landing-fade-in-delay-1">
        <h2 style={styles.demoTitle}>What your patients get</h2>
        <p style={styles.demoSubtitle}>A clean, organized schedule — generated in seconds, not minutes.</p>
        <div style={styles.demoCard} className="landing-demo-card">
          <DemoCalendarSection />
        </div>
      </section>

      {/* Footer — minimal */}
      <footer style={styles.footer} className="landing-fade-in landing-fade-in-delay-2 landing-footer">
        <div style={styles.footerLinks}>
          <a href="/about" style={styles.footerLink}>About</a>
          <a href="/privacy" style={styles.footerLink}>Privacy</a>
          <a href="/terms" style={styles.footerLink}>Terms</a>
          <a href="/security" style={styles.footerLink}>Security</a>
        </div>
        <p style={styles.footerCopy}>
          &copy; 2026 Patient Owl &middot; A product of Moose Bay &amp; Company LLC
        </p>
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
    maxWidth: 'clamp(320px, 90vw, 800px)',
    margin: '0 auto',
  },
  headline: {
    fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
    fontWeight: 800,
    color: 'var(--dark)',
    lineHeight: 1.15,
    margin: '1.5rem 0 1rem',
  },
  alienSubtext: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: '-0.5rem',
    marginBottom: '0.75rem',
    cursor: 'default',
    userSelect: 'all' as const,
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
  userTypeRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  userTypeBtn: {
    flex: 1,
    padding: '0.5rem',
    border: '2px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    background: 'var(--white)',
    color: 'var(--gray-text)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  userTypeBtnActive: {
    border: '2px solid var(--green-mid)',
    background: 'var(--green-bg)',
    color: 'var(--green-dark)',
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
  termsRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    marginBottom: '0.75rem',
    cursor: 'pointer',
  },
  termsText: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    lineHeight: 1.4,
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

  // Demo Calendar
  demoSection: {
    textAlign: 'center' as const,
    padding: '2rem 1.5rem 1rem',
    maxWidth: 'clamp(320px, 90vw, 960px)',
    margin: '0 auto',
  },
  demoTitle: {
    fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.25rem',
  },
  demoSubtitle: {
    fontSize: '0.95rem',
    color: 'var(--gray-text)',
    marginBottom: '1.5rem',
  },
  demoCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    border: '1px solid var(--green-bg)',
  },

  // Footer
  footer: {
    marginTop: 'auto',
    textAlign: 'center' as const,
    padding: '1.5rem',
    borderTop: '1px solid var(--green-bg)',
    background: 'var(--green-bg-footer)',
  },
  footerLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1.5rem',
    marginBottom: '0.75rem',
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
