import { useMemo, useState } from 'react';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

/** Small inline hourglass — same sand animation as the overlay, but card-embedded */
function InlineHourglass() {
  const particles = useMemo(() => {
    const p = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      p.push({
        xStart: Math.sin(angle) * 12,
        xEnd: Math.cos(angle + 1) * 10,
        delay: (i / 8) * 2.5,
        size: 2 + (i % 2),
      });
    }
    return p;
  }, []);

  return (
    <div className="ptowl-hourglass" style={{ width: 80, height: 80, margin: '0 auto 1rem' }}>
      {particles.map((p, i) => (
        <span
          key={i}
          className="ptowl-sand"
          style={{
            '--sand-delay': `${p.delay}s`,
            '--sand-x-start': `${p.xStart}px`,
            '--sand-x-end': `${p.xEnd}px`,
            '--sand-size': `${p.size}px`,
          } as React.CSSProperties}
        />
      ))}
      <span
        className="ptowl-hourglass-o"
        style={{ fontSize: '3rem' }}
        aria-hidden="true"
      >O</span>
      <div className="ptowl-sand-pile" />
    </div>
  );
}

export function PendingPage() {
  usePageTitle('Pending Approval');
  const { refreshUser, logout } = useAuth();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');

  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage('');
    await refreshUser();
    // If still on this page after refresh, user is still pending
    setMessage('Still waiting for approval. Check back soon!');
    setChecking(false);
  };

  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.center}>
        {/* Hero brand mark */}
        <div style={styles.brand}>
          <OwlLogo size="lg" linkTo="/" />
        </div>

        <div style={styles.card} className="ptowl-center-card">
          <InlineHourglass />
          <h1 style={styles.title}>Account Pending</h1>
          <p style={styles.text}>
            Your registration was successful! An admin has been notified and will approve your account shortly.
          </p>
          <p style={styles.textSmall}>
            Once approved, you'll have full access to create and print patient schedules.
          </p>

          <button
            style={{ ...styles.checkBtn, opacity: checking ? 0.6 : 1 }}
            onClick={handleCheckStatus}
            disabled={checking}
          >
            {checking ? 'Checking...' : 'Check Approval Status'}
          </button>

          {message && <p style={styles.message}>{message}</p>}

          <button style={styles.logoutBtn} onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--off-white)', padding: '1rem' },
  center: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', width: '100%', maxWidth: '420px' },
  brand: { marginBottom: '2rem' },
  card: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '3rem', width: '100%', textAlign: 'center' as const, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  title: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.75rem' },
  text: { color: 'var(--gray-text)', lineHeight: 1.6, marginBottom: '0.5rem' },
  textSmall: { color: 'var(--gray-text)', lineHeight: 1.6, marginBottom: '1.5rem', fontSize: '0.85rem', opacity: 0.8 },
  checkBtn: { width: '100%', padding: '0.875rem', background: 'var(--green-mid)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '1rem', fontWeight: 600, cursor: 'pointer' },
  message: { color: 'var(--gray-text)', fontSize: '0.85rem', marginTop: '0.75rem' },
  logoutBtn: { width: '100%', padding: '0.5rem', background: 'transparent', border: 'none', color: 'var(--gray-text)', fontSize: '0.85rem', cursor: 'pointer', marginTop: '1rem' },
};
