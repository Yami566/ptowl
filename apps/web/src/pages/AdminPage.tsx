import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest, setCSRFToken } from '../api/client.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';
import { signInWithEmail } from '../lib/firebase.js';

/** Convert Firebase error codes to user-friendly messages */
function parseFirebaseError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const match = msg.match(/\(auth\/([^)]+)\)/);
  const code = match ? match[1] : '';
  switch (code) {
    case 'user-not-found': case 'wrong-password': case 'invalid-credential':
      return 'Invalid admin credentials.';
    case 'too-many-requests':
      return 'Too many attempts. Please wait a few minutes.';
    case 'user-disabled':
      return 'This admin account has been disabled.';
    default:
      return msg || 'Login failed.';
  }
}

interface PendingUser {
  id: string;
  email: string;
  display_name: string;
  status: string;
  created_at: string;
}

export function AdminPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'login' | 'code' | 'dashboard'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [code, setCode] = useState('');
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Focus code input when step changes
  useEffect(() => {
    if (step === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step, codeSent]);

  // Step 1: Admin login via Firebase → then backend admin verification
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Authenticate through Firebase (third-party)
      const idToken = await signInWithEmail(email, password);

      // Exchange Firebase token for admin session (backend verifies admin role)
      const result = await apiRequest<{ needs_email_code?: boolean; email?: string }>('/admin/login', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });

      if (result.ok && result.data?.needs_email_code) {
        setAdminEmail(result.data.email || email);
        setStep('code');
      } else {
        setError(result.error?.message || 'Login failed');
      }
    } catch (err) {
      setError(parseFirebaseError(err));
    }
    setLoading(false);
  };

  // Step 2a: Request verification code
  const handleSendCode = async () => {
    setError('');
    setLoading(true);

    const result = await apiRequest<{ message: string }>('/admin/send-code', { method: 'POST' });

    if (result.ok) {
      setCodeSent(true);
    } else {
      setError(result.error?.message || 'Failed to send code');
    }
    setLoading(false);
  };

  // Step 2b: Verify the code
  const handleVerifyCode = async (submittedCode: string) => {
    setError('');
    setLoading(true);

    const result = await apiRequest<{ csrfToken?: string }>('/admin/verify-code', {
      method: 'POST',
      body: JSON.stringify({ code: submittedCode }),
    });

    if (result.ok && result.data?.csrfToken) {
      setCSRFToken(result.data.csrfToken);
      setStep('dashboard');
    } else {
      setError(result.error?.message || 'Invalid code');
      setCode('');
    }
    setLoading(false);
  };

  // Auto-submit when 6 digits entered
  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6);
    setCode(cleaned);
    if (cleaned.length === 6) {
      handleVerifyCode(cleaned);
    }
  };

  // Fetch users when authenticated
  useEffect(() => {
    if (step !== 'dashboard') return;
    apiRequest<PendingUser[]>('/admin/users').then((r) => r.ok && r.data && setUsers(r.data));
  }, [step]);

  const handleApprove = async (userId: string) => {
    setError('');
    const result = await apiRequest(`/admin/users/${userId}/approve`, { method: 'POST' });
    if (result.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'approved' } : u)));
    } else {
      setError(result.error?.message || 'Failed to approve user');
    }
  };

  const handleDeny = async (userId: string) => {
    setError('');
    const result = await apiRequest(`/admin/users/${userId}/deny`, { method: 'POST' });
    if (result.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'denied' } : u)));
    } else {
      setError(result.error?.message || 'Failed to deny user');
    }
  };

  // ── Step 2: Email verification code ──
  if (step === 'code') {
    return (
      <div style={styles.page}>
        {loading && <LoadingOverlay message="Verifying..." />}
        <div style={styles.card}>
          <div style={{ textAlign: 'center' as const, marginBottom: '1rem' }}><OwlLogo size="md" linkTo="/login" /></div>
          <h2 style={styles.title}>Email Verification</h2>

          {!codeSent ? (
            <>
              <p style={styles.text}>
                We'll send a 6-digit verification code to:
              </p>
              <p style={styles.emailHighlight}>{adminEmail}</p>
              {error && <div style={styles.error}>{error}</div>}
              <button style={styles.button} onClick={handleSendCode} disabled={loading}>
                Send Verification Code
              </button>
            </>
          ) : (
            <>
              <p style={styles.text}>
                A code was sent to <strong>{adminEmail}</strong>.
                Check your inbox and enter it below.
              </p>
              <p style={styles.expiry}>Code expires in 5 minutes</p>
              {error && <div style={styles.error}>{error}</div>}
              <input
                ref={codeInputRef}
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="000000"
                style={styles.codeInput}
                maxLength={6}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="6-digit verification code"
              />
              <button
                style={styles.resendBtn}
                onClick={() => { setCode(''); setCodeSent(false); setError(''); handleSendCode(); }}
              >
                Resend Code
              </button>
            </>
          )}

          <button style={styles.backLink} onClick={() => { setStep('login'); setError(''); setCode(''); setCodeSent(false); }}>
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: Admin login ──
  if (step === 'login') {
    return (
      <div style={styles.page}>
        {loading && <LoadingOverlay message="Authenticating..." />}
        <div style={styles.card}>
          <div style={{ textAlign: 'center' as const, marginBottom: '1rem' }}><OwlLogo size="md" linkTo="/login" /></div>
          <h2 style={styles.title}>Admin Panel</h2>
          <form onSubmit={handleLogin} style={styles.form}>
            {error && <div style={styles.error}>{error}</div>}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email" style={styles.input} required autoFocus aria-label="Admin email" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={styles.input} required aria-label="Password" />
            <button type="submit" style={styles.button} disabled={loading}>
              Sign In
            </button>
          </form>
          <button style={styles.backLink} onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // ── Step 3: Admin dashboard ──
  const pending = users.filter((u) => u.status === 'pending');
  const others = users.filter((u) => u.status !== 'pending');

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><OwlLogo size="md" linkTo="/dashboard" /><span style={styles.adminLabel}>Admin</span></span>
        <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
      </header>
      <main id="main-content" style={styles.main}>
        {error && <div style={{ ...styles.error, marginBottom: '1rem' }}>{error}</div>}

        {pending.length > 0 && (
          <>
            <h3 style={styles.sectionTitle}>Pending Approval ({pending.length})</h3>
            {pending.map((u) => (
              <div key={u.id} style={styles.userRow}>
                <div>
                  <strong>{u.email}</strong>
                  <span style={styles.userDate}> &middot; {new Date(u.created_at).toLocaleDateString()}</span>
                </div>
                <div style={styles.actions}>
                  <button style={styles.approveBtn} onClick={() => handleApprove(u.id)}>Approve</button>
                  <button style={styles.denyBtn} onClick={() => handleDeny(u.id)}>Deny</button>
                </div>
              </div>
            ))}
          </>
        )}

        {pending.length === 0 && (
          <div style={styles.noPending}>
            <p style={{ color: 'var(--gray-text)', fontSize: '1rem' }}>No pending accounts to review</p>
          </div>
        )}

        <h3 style={{ ...styles.sectionTitle, marginTop: '2rem' }}>All Users ({others.length})</h3>
        {others.map((u) => (
          <div key={u.id} style={styles.userRow}>
            <div>
              <strong>{u.email}</strong>
              <span style={styles.userDate}> &middot; {u.display_name}</span>
            </div>
            <span style={{ color: u.status === 'approved' ? 'var(--green-mid)' : 'var(--orange-mid)', fontWeight: 600, fontSize: '0.8rem' }}>
              {u.status}
            </span>
          </div>
        ))}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)', display: 'flex', flexDirection: 'column' as const },
  card: { maxWidth: '420px', margin: 'auto', background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', textAlign: 'center' as const },
  text: { color: 'var(--gray-text)', fontSize: '0.875rem', marginBottom: '0.5rem', textAlign: 'center' as const },
  emailHighlight: { textAlign: 'center' as const, fontWeight: 600, color: 'var(--dark)', fontSize: '1rem', marginBottom: '1.5rem' },
  expiry: { textAlign: 'center' as const, fontSize: '0.75rem', color: 'var(--orange-mid)', fontWeight: 600, marginBottom: '1rem' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
  input: { padding: '0.75rem', border: '1px solid var(--gray-mid)', borderRadius: 'var(--radius)', fontSize: '1rem' },
  codeInput: { display: 'block', width: '100%', padding: '1rem', fontSize: '2rem', textAlign: 'center' as const, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.5rem', border: '2px solid var(--green-mid)', borderRadius: 'var(--radius)', boxSizing: 'border-box' as const },
  button: { padding: '0.75rem', background: 'var(--green-mid)', color: 'white', borderRadius: 'var(--radius)', fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem' },
  resendBtn: { display: 'block', width: '100%', background: 'none', color: 'var(--gray-text)', fontSize: '0.85rem', marginTop: '1rem', textDecoration: 'underline', cursor: 'pointer' },
  error: { background: 'var(--red-light)', color: 'var(--red-mid)', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', textAlign: 'center' as const },
  backLink: { display: 'block', textAlign: 'center' as const, marginTop: '1rem', background: 'none', color: 'var(--gray-text)', fontSize: '0.875rem', cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--white)', borderBottom: '1px solid var(--gray-mid)' },
  adminLabel: { fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--gray-text)' },
  backBtn: { padding: '0.5rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontSize: '0.875rem' },
  main: { maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem', flex: 1 },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--dark)' },
  userRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-mid)', marginBottom: '0.5rem' },
  userDate: { color: 'var(--gray-text)', fontSize: '0.8rem' },
  actions: { display: 'flex', gap: '0.5rem' },
  approveBtn: { padding: '0.375rem 0.75rem', background: 'var(--green-mid)', color: 'white', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 },
  denyBtn: { padding: '0.375rem 0.75rem', background: 'var(--red-light)', color: 'var(--red-mid)', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 },
  noPending: { textAlign: 'center' as const, padding: '2rem', background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--gray-mid)' },
};
