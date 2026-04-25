import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext.js';
import { apiRequest } from '../api/client.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { PageLayout } from '../components/layout/PageLayout.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';

interface PendingUser {
  id: string;
  email: string;
  phone?: string;
  display_name: string;
  status: string;
  created_at: string;
}

export function AdminPage() {
  usePageTitle('Admin');
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  // Admin is already logged in via phone auth. Just need email 2FA to access admin panel.
  const [step, setStep] = useState<'code' | 'dashboard'>(user?.role === 'admin' ? 'code' : 'code');
  const [code, setCode] = useState('');
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  // If not logged in or not admin, redirect
  useEffect(() => {
    if (!user) {
      navigate('/', { replace: true });
    } else if (user.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  // Focus code input when step changes
  useEffect(() => {
    if (step === 'code' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step, codeSent]);

  // Request verification code
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

  // Verify the code
  const handleVerifyCode = async (submittedCode: string) => {
    setError('');
    setLoading(true);

    const result = await apiRequest<{ verified?: boolean }>('/admin/verify-code', {
      method: 'POST',
      body: JSON.stringify({ code: submittedCode }),
    });

    if (result.ok) {
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
    const result = await apiRequest(`/admin/users/${userId}/approve`, { method: 'POST' });
    if (result.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'approved' } : u)));
      toast.success('User approved');
    } else {
      toast.error(result.error?.message || 'Failed to approve user');
    }
  };

  const handleDeny = async (userId: string) => {
    const result = await apiRequest(`/admin/users/${userId}/deny`, { method: 'POST' });
    if (result.ok) {
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'denied' } : u)));
      toast.success('User denied');
    } else {
      toast.error(result.error?.message || 'Failed to deny user');
    }
  };

  if (!user || user.role !== 'admin') return null;

  // ── Email 2FA verification ──
  if (step === 'code') {
    return (
      <PageLayout>
        <div style={styles.page}>
          {loading && <LoadingOverlay message="Verifying..." />}
          <div style={styles.card}>
            <div style={{ textAlign: 'center' as const, marginBottom: '1rem' }}>
              <OwlLogo size="md" linkTo="/" />
            </div>
            <h1 style={styles.title}>Admin Verification</h1>

            {!codeSent ? (
              <>
                <p style={styles.text}>
                  A 6-digit code will be sent to the admin email to verify your identity.
                </p>
                <div
                  style={error ? styles.error : { height: 0, overflow: 'hidden' }}
                  aria-live="assertive"
                  role="alert"
                >
                  {error ? `Error: ${error}` : ''}
                </div>
                <button style={styles.button} onClick={handleSendCode} disabled={loading}>
                  Send Verification Code
                </button>
              </>
            ) : (
              <>
                <p style={styles.text}>Check the admin email for a 6-digit code. Enter it below.</p>
                <p style={styles.expiry}>Code expires in 5 minutes</p>
                <div
                  style={error ? styles.error : { height: 0, overflow: 'hidden' }}
                  aria-live="assertive"
                  role="alert"
                >
                  {error ? `Error: ${error}` : ''}
                </div>
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
                  onClick={() => {
                    setCode('');
                    setCodeSent(false);
                    setError('');
                    handleSendCode();
                  }}
                >
                  Resend Code
                </button>
              </>
            )}

            <button style={styles.backLink} onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // ── Admin dashboard ──
  const pending = users.filter((u) => u.status === 'pending');
  const others = users.filter((u) => u.status !== 'pending');

  return (
    <PageLayout>
      <div style={styles.page}>
        <header style={styles.header} className="ptowl-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <OwlLogo size="md" linkTo="/" />
            <span style={styles.adminLabel}>Admin</span>
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }} className="ptowl-header-actions">
            <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
            <button style={styles.logoutBtn} onClick={logout}>
              Logout
            </button>
          </div>
        </header>
        <main id="main-content" style={styles.main} className="ptowl-main">
          {pending.length > 0 && (
            <>
              <h3 style={styles.sectionTitle}>Pending Approval ({pending.length})</h3>
              {pending.map((u) => (
                <div key={u.id} style={styles.userRow} className="admin-user-row">
                  <div>
                    <strong>{u.phone || u.email}</strong>
                    <span style={styles.userDate}>
                      {' '}
                      &middot; {new Date(u.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={styles.actions}>
                    <button style={styles.approveBtn} onClick={() => handleApprove(u.id)}>
                      Approve
                    </button>
                    <button style={styles.denyBtn} onClick={() => handleDeny(u.id)}>
                      Deny
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {pending.length === 0 && (
            <div style={styles.noPending}>
              <p style={{ color: 'var(--gray-text)', fontSize: '1rem' }}>
                No pending accounts to review
              </p>
            </div>
          )}

          <h3 style={{ ...styles.sectionTitle, marginTop: '2rem' }}>All Users ({others.length})</h3>
          {others.map((u) => (
            <div key={u.id} style={styles.userRow}>
              <div>
                <strong>{u.phone || u.email}</strong>
                <span style={styles.userDate}> &middot; {u.display_name}</span>
              </div>
              <span
                style={{
                  color: u.status === 'approved' ? 'var(--green-mid)' : 'var(--orange-mid)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                }}
              >
                {u.status}
              </span>
            </div>
          ))}
        </main>
      </div>
    </PageLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--off-white)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  card: {
    maxWidth: '420px',
    margin: 'auto',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2.5rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '1rem',
    textAlign: 'center' as const,
  },
  text: {
    color: 'var(--gray-text)',
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
    textAlign: 'center' as const,
  },
  expiry: {
    textAlign: 'center' as const,
    fontSize: '0.75rem',
    color: 'var(--orange-mid)',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  codeInput: {
    display: 'block',
    width: '100%',
    padding: '1rem',
    fontSize: '2rem',
    textAlign: 'center' as const,
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    letterSpacing: '0.5rem',
    border: '2px solid var(--green-mid)',
    borderRadius: 'var(--radius)',
    boxSizing: 'border-box' as const,
  },
  button: {
    padding: '0.75rem',
    background: 'var(--green-mid)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    marginTop: '0.5rem',
    width: '100%',
    cursor: 'pointer',
    border: 'none',
  },
  resendBtn: {
    display: 'block',
    width: '100%',
    padding: '0.625rem',
    background: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.85rem',
    marginTop: '1rem',
    textDecoration: 'underline',
    cursor: 'pointer',
    border: 'none',
  },
  error: {
    background: 'var(--red-light)',
    color: 'var(--red-mid)',
    padding: '0.75rem',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    textAlign: 'center' as const,
  },
  backLink: {
    display: 'block',
    textAlign: 'center' as const,
    marginTop: '1rem',
    padding: '0.625rem',
    background: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.875rem',
    cursor: 'pointer',
    border: 'none',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: 'var(--white)',
    borderBottom: '1px solid var(--gray-mid)',
  },
  adminLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--gray-text)',
  },
  backBtn: {
    padding: '0.625rem 1rem',
    background: 'var(--gray-light)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    border: 'none',
    cursor: 'pointer',
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    background: 'var(--red-light)',
    color: 'var(--red-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
  },
  main: {
    maxWidth: 'clamp(320px, 92vw, 960px)',
    margin: '0 auto',
    padding: '2rem 1.5rem',
    flex: 1,
  },
  sectionTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '0.75rem',
    color: 'var(--dark)',
  },
  userRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.875rem 1rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--gray-mid)',
    marginBottom: '0.5rem',
  },
  userDate: { color: 'var(--gray-text)', fontSize: '0.8rem' },
  actions: { display: 'flex', gap: '0.5rem' },
  approveBtn: {
    padding: '0.375rem 0.75rem',
    background: 'var(--green-mid)',
    color: 'white',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  denyBtn: {
    padding: '0.375rem 0.75rem',
    background: 'var(--red-light)',
    color: 'var(--red-mid)',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  noPending: {
    textAlign: 'center' as const,
    padding: '2rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    border: '1px dashed var(--gray-mid)',
  },
};
