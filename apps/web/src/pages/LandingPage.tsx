import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
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
        </div>
        <h1 style={styles.headline}>Stop scheduling. Start treating.</h1>
        <p style={styles.subheadline}>
          Create and print patient schedules in under <strong>5 keypresses</strong>. Built for
          medical and dental providers, because your schedule shouldn&apos;t take longer than your
          coffee order.
        </p>

        {/* Beta badge — sits directly above the auth card so it's
            visible at the moment of conversion (sign-in). */}
        <div style={styles.betaBadge} aria-label="Free beta, powered by Claude">
          <span style={styles.betaPill}>Free beta</span>
          <span style={styles.betaSep}>·</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={styles.betaIcon}
          >
            <path
              d="M12 2 L13.5 9.5 L22 11 L13.5 14.5 L12 22 L10.5 14.5 L2 11 L10.5 9.5 Z"
              fill="currentColor"
            />
          </svg>
          <span style={styles.betaPoweredBy}>Powered by Claude</span>
        </div>

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
          <a href="https://status.ptowl.com" style={styles.footerLink} rel="noopener">
            Status
          </a>
          <a href="mailto:help@ptowl.com" style={styles.footerLink}>
            Help
          </a>
        </div>
        {/*
          Powered-by-Claude badge. The inline sparkle SVG below is a
          generic placeholder, not Anthropic's trademarked mark. When
          you have permission to use the official Anthropic brand
          asset, swap the <svg> for an <img src="/powered-by-claude.svg" />
          (drop the file in apps/web/public/) per
          https://www.anthropic.com/brand
        */}
        <a
          href="https://www.anthropic.com/api"
          style={styles.poweredByBadge}
          rel="noopener"
          target="_blank"
          aria-label="Powered by Claude — opens anthropic.com"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            aria-hidden="true"
            style={styles.poweredByIcon}
          >
            <path
              d="M12 2 L13.5 9.5 L22 11 L13.5 14.5 L12 22 L10.5 14.5 L2 11 L10.5 9.5 Z"
              fill="currentColor"
            />
          </svg>
          <span>Powered by Claude</span>
        </a>
        <p style={styles.footerPoweredBy}>Free during beta</p>
        <p style={styles.footerCopy}>
          &copy; 2026 PTowl &middot; A product of Moose Bay &amp; Company LLC
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
    gap: '1rem',
    marginBottom: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  footerLink: {
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
    textDecoration: 'none',
    padding: '0.5rem 0.75rem',
    display: 'inline-block',
  },
  footerPoweredBy: {
    fontSize: '0.7rem',
    color: 'var(--gray-text)',
    marginBottom: '0.25rem',
    opacity: 0.7,
  },
  poweredByBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.75rem',
    margin: '0 auto 0.375rem',
    background: 'var(--white)',
    border: '1px solid var(--green-light)',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--green-dark)',
    textDecoration: 'none',
    boxShadow: '0 1px 3px rgba(27, 94, 32, 0.06)',
  },
  poweredByIcon: {
    color: 'var(--green-mid)',
    flexShrink: 0,
  },
  footerCopy: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    opacity: 0.6,
  },
  betaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.875rem',
    margin: '0 auto 1rem',
    background: 'var(--green-bg)',
    border: '1px solid var(--green-light)',
    borderRadius: '999px',
    fontSize: '0.75rem',
    color: 'var(--green-dark)',
    fontWeight: 600,
    letterSpacing: '0.02em',
  },
  betaPill: {
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
  },
  betaSep: {
    opacity: 0.5,
  },
  betaPoweredBy: {
    color: 'var(--green-dark)',
  },
  betaIcon: {
    color: 'var(--green-mid)',
    flexShrink: 0,
  },
};
