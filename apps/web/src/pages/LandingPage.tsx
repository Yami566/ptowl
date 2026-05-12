import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { OwlCityScene } from '../components/decorative/OwlCityScene.js';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { AuthWidget } from '../components/auth/AuthWidget.js';
import { DEFAULT_TEMPLATES } from '@ptowl/shared';

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

  const placeholderStyles: React.CSSProperties = {
    minHeight: '300px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--gray-text)',
    fontSize: '0.9rem',
  };

  if (!dayGridPlugin) return <div style={placeholderStyles}>Loading calendar preview…</div>;

  return (
    <Suspense fallback={<div style={placeholderStyles}>Loading calendar preview…</div>}>
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
  const { user } = useAuth();

  // Render the landing immediately. AuthContext checks session in the
  // background and redirects signed-in users to /dashboard within a
  // fraction of a second. No "restoring session" splash — that wording
  // mis-greeted first-time visitors as if they were returning users.
  // The brief flash signed-in users see before the redirect is
  // imperceptible at typical Clerk init times (~200-500ms).
  if (user) return null;

  return (
    <main style={styles.page}>
      {/* Hero */}
      <section style={styles.hero} className="landing-fade-in landing-hero">
        {/* Combined logo + header: city scene with PTOWL wordmark
            embedded inside the SVG (same green + orange brand colors
            as the small <OwlLogo>). Replaces the prior text-only logo. */}
        <div style={styles.heroScene}>
          <OwlCityScene size="lg" showWordmark />
        </div>
        <h1 style={styles.headline}>Recurring patient schedules in 5 keypresses.</h1>
        <p style={styles.subheadline}>
          Built for therapy clinics — PT, OT, SLP, chiropractic, mental-health, and dental hygiene.
          No PHI stored. Free during beta.
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

        {/* Trust microcopy — disarms the "is this going to charge me"
            reflex right at the conversion moment. Single-line, small,
            renders just below the Beta badge and just above the auth
            card. */}
        <p style={styles.betaTrustNote}>No credit card, ever during beta.</p>

        {/* Clerk's drop-in <SignIn /> widget. Providers (Google + email/
            password today) are configured in the Clerk dashboard, not
            here. See AuthWidget.tsx for the wrapper. */}
        <div id="auth-card" style={styles.authCard} className="landing-auth-card">
          <AuthWidget />
        </div>
      </section>

      {/* How it works — animated 5-keypress walkthrough.
          Hooks into the existing keyframe choreography in globals.css
          (`landing-how-section .landing-steps > :nth-child(N) .key-animate`).
          Five keys + four arrows = 9 children, sequenced over ~6.6s.
          Each step's animation is a single play that freezes in a
          "fully visible, fresh-key" final state. Visitor sees the
          5-keypress promise happen on the page before signing up. */}
      <section
        style={styles.howSection}
        className="landing-how-section landing-fade-in landing-fade-in-delay-1"
        aria-label="How PTowl works in 5 keypresses"
      >
        <h2 style={styles.howTitle}>5 keypresses. That&apos;s the whole product.</h2>
        <div className="landing-steps" style={styles.howSteps}>
          <div style={styles.howStep}>
            <span className="key-animate" style={styles.howKey}>
              2
            </span>
            <p style={styles.howStepLabel}>Pick a preset</p>
          </div>
          <span className="landing-step-arrow" style={styles.howArrow} aria-hidden="true">
            →
          </span>
          <div style={styles.howStep}>
            <span className="key-animate" style={styles.howKey}>
              JS
            </span>
            <p style={styles.howStepLabel}>Initials</p>
          </div>
          <span className="landing-step-arrow" style={styles.howArrow} aria-hidden="true">
            →
          </span>
          <div style={styles.howStep}>
            <span className="key-animate" style={styles.howKey}>
              ↵
            </span>
            <p style={styles.howStepLabel}>Enter</p>
          </div>
          <span className="landing-step-arrow" style={styles.howArrow} aria-hidden="true">
            →
          </span>
          <div style={styles.howStep}>
            <span className="key-animate" style={styles.howKey}>
              📅
            </span>
            <p style={styles.howStepLabel}>Schedule done</p>
          </div>
          <span className="landing-step-arrow" style={styles.howArrow} aria-hidden="true">
            →
          </span>
          <div style={styles.howStep}>
            <span className="key-animate" style={styles.howKey}>
              🖨
            </span>
            <p style={styles.howStepLabel}>Print or share</p>
          </div>
        </div>
        <p style={styles.howCaption}>
          From blank page to printed schedule in seconds, not minutes.
        </p>
      </section>

      {/* Public template preview — visitors see the 6 specialty defaults
          before signing up so the product feels real. Sources from
          @ptowl/shared so this stays in sync with what new users actually
          get seeded on first sign-in. Click any card to bounce visitors
          to the auth widget — the actual selection happens after sign-in. */}
      <section
        style={styles.templatesSection}
        className="landing-fade-in landing-fade-in-delay-1 landing-templates-section"
        aria-labelledby="landing-templates-title"
      >
        <h2 id="landing-templates-title" style={styles.templatesTitle}>
          6 templates ready out of the box.
        </h2>
        <p style={styles.templatesSubtitle}>
          Sign in and one of these is already set to a hotkey. Customize anytime.
        </p>
        <div style={styles.templatesGrid} className="landing-templates-grid">
          {DEFAULT_TEMPLATES.map((tmpl) => (
            <a
              key={tmpl.hotkey}
              href="#auth-card"
              style={styles.templateCard}
              className="landing-template-card"
              aria-label={`${tmpl.name} — ${tmpl.sessions_per_week} sessions per week for ${tmpl.duration_weeks} weeks. Sign in to use.`}
            >
              <span style={styles.templateHotkey}>{tmpl.hotkey}</span>
              <div style={styles.templateBody}>
                <span style={styles.templateName}>{tmpl.name}</span>
                <span style={styles.templateMeta}>
                  {tmpl.sessions_per_week}x/wk &middot; {tmpl.duration_weeks} wks
                </span>
                <span style={styles.templateTime}>&#9200; {tmpl.default_time}</span>
              </div>
            </a>
          ))}
        </div>
        <p style={styles.templatesNote}>
          Don&rsquo;t see your specialty? After sign-in you can rename, retime, or replace any
          template in seconds.
        </p>
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
          {/* Status link removed until status.ptowl.com is live. The
              Upptime page is documented in PRODUCTION-LAUNCH-RUNBOOK
              section 1d but hasn't been wired yet; linking to a dead
              subdomain reads as broken to anyone who clicks. Restore
              this <a> once the public uptime page is up. */}
          <a href="mailto:nurelimusabay@gmail.com" style={styles.footerLink}>
            Help
          </a>
        </div>
        {/* Powered-by-Claude line — inline, no pill chrome. Orange
            generic-sparkle SVG sits to the right of the text. Swap the
            inline <svg> for an <img src="/powered-by-claude.svg" /> if
            you obtain Anthropic's official brand asset. */}
        <p style={styles.footerPoweredBy}>
          Free during beta &middot;{' '}
          <a
            href="https://www.anthropic.com/api"
            style={styles.footerPoweredByLink}
            rel="noopener"
            target="_blank"
            aria-label="Powered by Claude — opens anthropic.com"
          >
            Powered by Claude
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={styles.footerPoweredByMark}
            >
              <path
                d="M12 2 L13.5 9.5 L22 11 L13.5 14.5 L12 22 L10.5 14.5 L2 11 L10.5 9.5 Z"
                style={{ fill: 'var(--orange-mid)' }}
              />
            </svg>
          </a>
        </p>
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
    background: 'linear-gradient(180deg, var(--green-bg) 0%, var(--white) 40%)',
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
  heroScene: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1.25rem',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    boxShadow: '0 8px 30px rgba(15, 32, 39, 0.18)',
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
  templatesSection: {
    textAlign: 'center' as const,
    padding: '2rem 1.5rem 1rem',
    maxWidth: 'clamp(320px, 90vw, 960px)',
    margin: '0 auto',
  },
  templatesTitle: {
    fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.25rem',
  },
  templatesSubtitle: {
    fontSize: '0.95rem',
    color: 'var(--gray-text)',
    marginBottom: '1.5rem',
  },
  templatesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '0.75rem',
    margin: '0 auto',
  },
  templateCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem 1rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--green-bg)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    textDecoration: 'none',
    color: 'var(--dark)',
    transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
    textAlign: 'left' as const,
  },
  templateHotkey: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    minWidth: '32px',
    background: 'var(--green-dark)',
    color: 'var(--white)',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '0.875rem',
  },
  templateBody: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.15rem',
    flex: 1,
    minWidth: 0,
  },
  templateName: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--dark)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis' as const,
  },
  templateMeta: {
    fontSize: '0.78rem',
    color: 'var(--gray-text)',
  },
  templateTime: {
    fontSize: '0.72rem',
    color: 'var(--green-dark)',
    fontFamily: 'var(--font-mono)',
  },
  templatesNote: {
    fontSize: '0.825rem',
    color: 'var(--gray-text)',
    fontStyle: 'italic' as const,
    marginTop: '1.25rem',
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
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
    marginBottom: '0.25rem',
  },
  footerPoweredByLink: {
    color: 'var(--gray-text)',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  footerPoweredByMark: {
    flexShrink: 0,
    verticalAlign: 'middle',
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
  betaTrustNote: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    textAlign: 'center' as const,
    margin: '0 0 1rem',
    fontStyle: 'italic' as const,
    letterSpacing: '0.01em',
  },

  // ── How-it-works animated walkthrough ──
  // Visual styles only. The animation timing lives in globals.css under
  // .landing-how-section .landing-steps > :nth-child(N). Keys + arrows
  // get their staggered animation from there; we only style the static
  // appearance here.
  howSection: {
    textAlign: 'center' as const,
    padding: '3rem 1.5rem 1rem',
    maxWidth: '960px',
    margin: '0 auto',
  },
  howTitle: {
    fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
    fontWeight: 800,
    color: 'var(--dark)',
    marginBottom: '1.5rem',
  },
  howSteps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
    marginBottom: '1rem',
  },
  howStep: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.5rem',
    minWidth: '4rem',
  },
  howKey: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '3.5rem',
    height: '3.5rem',
    padding: '0 0.75rem',
    background: 'var(--white)',
    border: '2px solid var(--green-mid)',
    borderRadius: '10px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '1.1rem',
    color: 'var(--green-dark)',
    boxShadow: '0 3px 0 var(--green-mid)',
  },
  howStepLabel: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    fontWeight: 500,
    marginTop: '0.25rem',
  },
  howArrow: {
    fontSize: '1.5rem',
    color: 'var(--green-mid)',
    fontWeight: 700,
    marginBottom: '1.5rem',
  },
  howCaption: {
    fontSize: '0.95rem',
    color: 'var(--gray-text)',
    fontStyle: 'italic' as const,
    marginTop: '0.5rem',
  },
};
