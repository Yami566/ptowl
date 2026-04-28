import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { FirebaseAuthUI } from '../components/auth/FirebaseAuthUI.js';

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
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gray-text)',
          }}
        >
          Loading calendar...
        </div>
      }
    >
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
  const { user, loading } = useAuth();
  const [alienActive, setAlienActive] = useState(false);

  // Alien easter egg — triggers when user highlights "until the aliens come."
  const handleAlienSelect = useCallback(() => {
    const sel = window.getSelection()?.toString().trim().toLowerCase();
    if (sel && sel.includes('until the aliens come')) {
      setAlienActive(true);
      const t = setTimeout(() => setAlienActive(false), 4000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  // Show loading while session restores — warm message for returning users
  if (loading) {
    return (
      <main style={{ ...styles.page, justifyContent: 'center', alignItems: 'center' }}>
        <OwlLogo size="lg" linkTo="/" />
        <p style={{ ...styles.subheadline, marginTop: '2rem' }}>
          Welcome back — restoring your session...
        </p>
      </main>
    );
  }

  // Already logged in — redirect handled by AuthContext
  if (user) return null;

  return (
    <main style={styles.page}>
      {/* Hero */}
      <section style={styles.hero} className="landing-fade-in landing-hero">
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.5rem' }}>
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
        <p style={styles.alienSubtext} onMouseUp={handleAlienSelect} onTouchEnd={handleAlienSelect}>
          until the aliens come.
        </p>
        <p style={styles.subheadline}>
          Create and print patient schedules in under <strong>5 keypresses</strong>. Built for
          physical therapists who value speed over clicks.
        </p>

        {/* FirebaseUI — Google's drop-in pre-built sign-in widget. The
            providers it renders (Phone, Google, Email-link, optionally
            Apple) are controlled in the Firebase console, not here. */}
        <div style={styles.authCard} className="landing-auth-card">
          <FirebaseAuthUI />
        </div>
      </section>

      {/* Demo Calendar */}
      <section style={styles.demoSection} className="landing-fade-in landing-fade-in-delay-1">
        <h2 style={styles.demoTitle}>What your patients get</h2>
        <p style={styles.demoSubtitle}>
          A clean, organized schedule — generated in seconds, not minutes.
        </p>
        <div style={styles.demoCard} className="landing-demo-card">
          <DemoCalendarSection />
        </div>
      </section>

      {/* Footer — minimal */}
      <footer
        style={styles.footer}
        className="landing-fade-in landing-fade-in-delay-2 landing-footer"
      >
        <div style={styles.footerLinks}>
          <a href="/about" style={styles.footerLink}>
            About
          </a>
          <a href="/privacy" style={styles.footerLink}>
            Privacy
          </a>
          <a href="/terms" style={styles.footerLink}>
            Terms
          </a>
          <a href="/security" style={styles.footerLink}>
            Security
          </a>
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
    padding: '2.5rem 1.5rem 2rem',
    maxWidth: 'clamp(320px, 90vw, 800px)',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box' as const,
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
  authCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem 1.5rem',
    boxShadow: '0 12px 32px rgba(27, 94, 32, 0.12), 0 2px 8px rgba(0, 0, 0, 0.05)',
    border: '1px solid var(--green-bg)',
    maxWidth: '420px',
    margin: '0 auto',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
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
