import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';

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
  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.center}>
        {/* Hero brand mark */}
        <div style={styles.brand}>
          <OwlLogo size="lg" linkTo="/login" />
        </div>

        <div style={styles.card}>
          <InlineHourglass />
          <h1 style={styles.title}>Account Pending</h1>
          <p style={styles.text}>
            Your registration has been submitted. An admin will review and approve your account.
            You'll receive an email once approved.
          </p>
          <Link to="/login" style={styles.link}>Back to login</Link>
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
  text: { color: 'var(--gray-text)', lineHeight: 1.6, marginBottom: '1.5rem' },
  link: { color: 'var(--green-mid)', fontWeight: 500 },
};
