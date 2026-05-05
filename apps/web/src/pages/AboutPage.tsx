import { QRCodeSVG } from 'qrcode.react';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { OwlCityScene } from '../components/decorative/OwlCityScene.js';
import { PageLayout } from '../components/layout/PageLayout.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export function AboutPage() {
  usePageTitle('About');

  return (
    <PageLayout>
      <main style={styles.page}>
        {/* Header */}
        <header style={styles.header}>
          <OwlLogo size="md" linkTo="/" />
        </header>

        {/* Hero */}
        <section style={styles.hero}>
          <div style={styles.heroScene}>
            <OwlCityScene size="lg" showWordmark />
          </div>
          <h1 style={styles.headline}>Built to make healthcare more simple and fun.</h1>
          <p style={styles.subheadline}>
            PTowl exists for the people who show up every day to help others move better — physical
            therapists, OTs, SLPs, chiropractors, mental-health therapists, dental hygienists, and
            anyone else who books recurring appointment series. We keep the tools simple so you can
            focus on what matters.
          </p>
        </section>

        {/* Stats */}
        <section style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statValue}>&lt; 5 sec</span>
            <span style={styles.statLabel}>Schedule creation</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>3–7x/wk</span>
            <span style={styles.statLabel}>Flexible frequency</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>52 weeks</span>
            <span style={styles.statLabel}>Max duration</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statValue}>QR + Print</span>
            <span style={styles.statLabel}>Share options</span>
          </div>
        </section>

        {/* How It Works */}
        <section style={styles.howSection}>
          <h2 style={styles.sectionTitle}>
            5 keypresses.{' '}
            <span style={{ opacity: 0.55, fontWeight: 400, fontStyle: 'italic' }}>
              Sometimes 4 if you&rsquo;re fast.
            </span>
          </h2>
          <div style={styles.steps}>
            <div style={styles.step}>
              <span style={styles.key}>1</span>
              <p style={styles.stepText}>Pick a template</p>
            </div>
            <span style={styles.arrow}>&rarr;</span>
            <div style={styles.step}>
              <span style={styles.key}>AB</span>
              <p style={styles.stepText}>Patient initials</p>
            </div>
            <span style={styles.arrow}>&rarr;</span>
            <div style={styles.step}>
              <span style={styles.key}>&#9166;</span>
              <p style={styles.stepText}>Generate</p>
            </div>
            <span style={styles.arrow}>&rarr;</span>
            <div style={styles.step}>
              <span style={styles.key}>P</span>
              <p style={styles.stepText}>Print</p>
            </div>
            <span style={{ ...styles.arrow, opacity: 0.4 }}>&rarr;</span>
            <div style={styles.step}>
              <span
                style={{
                  ...styles.key,
                  borderStyle: 'dashed',
                  opacity: 0.55,
                  transform: 'rotate(-2deg)',
                }}
              >
                &#9749;
              </span>
              <p style={{ ...styles.stepText, fontStyle: 'italic' }}>Sip coffee</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={styles.features}>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>&#129668;</div>
            <h3 style={styles.featureTitle}>You're the wizard here</h3>
            <p style={styles.featureDesc}>
              Make your own templates, use premade templates, switch your layout! Hotkeys,
              drag-and-drop, full control — your clinic runs your way.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>&#128029;</div>
            <h3 style={styles.featureTitle}>Schedulize your life</h3>
            <p style={styles.featureDesc}>
              Because life is a bee.. buzzing from patient to patient, appointment to appointment.
              Let us handle the hive.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>&#128274;</div>
            <h3 style={styles.featureTitle}>Private by Design</h3>
            <p style={styles.featureDesc}>
              Real names never enter our system. Just initials, mapped to sports legends on screen
              and on every printed sheet. If the data doesn&apos;t exist, it can&apos;t be breached.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>&#128197;</div>
            <h3 style={styles.featureTitle}>Calendar View</h3>
            <p style={styles.featureDesc}>
              See schedules as a full interactive calendar. Month, week, or day — drag appointments
              around and watch everything update.
            </p>
          </div>
          <div style={styles.featureCard}>
            <div style={styles.featureIcon}>&#128424;</div>
            <h3 style={styles.featureTitle}>Share & Print</h3>
            <p style={styles.featureDesc}>
              QR codes, shareable links, and print-ready layouts with your clinic branding. Hand it
              to patients or text them a link.
            </p>
          </div>
        </section>

        {/* Why open source */}
        <section style={styles.openSourceSection}>
          <h2 style={styles.sectionTitle}>Open source, on purpose.</h2>
          <p style={styles.openSourceCopy}>
            PTowl is released under the <strong>GNU Affero General Public License v3.0</strong>.
            That means three things, in order of how much we care:
          </p>
          <ul style={styles.openSourceList}>
            <li style={styles.openSourceItem}>
              <strong>Anyone can read the code, fork it, and run it themselves.</strong> A small
              clinic with a Cloudflare account can self-host PTowl on the free tier and never pay us
              a dollar. We think that&rsquo;s correct.
            </li>
            <li style={styles.openSourceItem}>
              <strong>
                Anyone modifying PTowl and running it as a service must share their changes back.
              </strong>{' '}
              The &ldquo;Affero&rdquo; clause is what stops a competitor from wholesale-rebranding
              our work as a closed-source product. It keeps the community contributing instead of
              taking.
            </li>
            <li style={styles.openSourceItem}>
              <strong>We chose this niche on purpose.</strong> Healthcare scheduling is full of
              bloated EHR systems and Word documents. Open source is how a tool becomes the default
              in a niche where no one&rsquo;s paying attention.
            </li>
          </ul>
          <p style={styles.openSourceCopy}>
            If AGPL-3.0 is incompatible with your situation, we&rsquo;re open to discussing a
            commercial license. Reach out via email below.
          </p>
        </section>

        {/* Contact */}
        <section style={styles.contactSection}>
          <h2 style={styles.contactTitle}>Get in Touch</h2>
          <p style={styles.contactDesc}>
            For sales, commercial licensing, or partnership inquiries:
          </p>
          <div style={styles.contactInfo}>
            <a href="tel:+17034009900" style={styles.contactLink}>
              703-400-9900
            </a>
            <span style={styles.contactDivider}>&middot;</span>
            <a href="mailto:nurelimusabay@gmail.com" style={styles.contactLink}>
              help@ptowl.com
            </a>
          </div>
        </section>

        {/* Footer */}
        <footer style={styles.footer}>
          <div style={styles.footerTop}>
            <OwlLogo size="sm" linkTo="/" />
            <div style={styles.qrWrap}>
              <QRCodeSVG
                value="https://ptowl.com"
                size={80}
                fgColor="#1B5E20"
                bgColor="transparent"
              />
              <span style={styles.qrLabel}>Scan to try on mobile</span>
            </div>
          </div>
          <div style={styles.footerLinks}>
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
          {/* Powered-by-Claude — inline, no chrome. Orange generic
              sparkle SVG to the right of the text. */}
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
                  fill="#D97757"
                />
              </svg>
            </a>
          </p>
          <p style={styles.footerCopy}>
            &copy; 2026 PTowl &middot; A product of Moose Bay &amp; Company LLC
          </p>
        </footer>
      </main>
    </PageLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  header: {
    display: 'flex',
    justifyContent: 'center',
    padding: '1.5rem',
    background: 'var(--white)',
    borderBottom: '1px solid var(--gray-mid)',
  },
  hero: {
    textAlign: 'center' as const,
    padding: '3rem 1.5rem 2rem',
    maxWidth: '700px',
    margin: '0 auto',
  },
  heroScene: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1rem',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    boxShadow: '0 6px 24px rgba(15, 32, 39, 0.15)',
  },
  headline: {
    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
    fontWeight: 800,
    color: 'var(--dark)',
    lineHeight: 1.2,
    marginBottom: '0.75rem',
  },
  subheadline: { fontSize: '1rem', color: 'var(--gray-text)', lineHeight: 1.6 },

  statsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: 'clamp(1rem, 3vw, 3rem)',
    flexWrap: 'wrap' as const,
    padding: '2rem 1.5rem',
    maxWidth: '960px',
    margin: '0 auto',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.25rem',
  },
  statValue: {
    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--green-dark)',
  },
  statLabel: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: 'var(--gray-text)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },

  howSection: {
    textAlign: 'center' as const,
    padding: '3rem 1.5rem',
    maxWidth: '960px',
    margin: '0 auto',
  },
  openSourceSection: {
    padding: '3rem 1.5rem',
    maxWidth: '760px',
    margin: '0 auto',
    textAlign: 'left' as const,
  },
  openSourceCopy: {
    fontSize: '1rem',
    color: 'var(--dark)',
    lineHeight: 1.7,
    marginBottom: '1rem',
  },
  openSourceList: {
    listStyle: 'none' as const,
    padding: 0,
    margin: '1.5rem 0',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  openSourceItem: {
    background: 'var(--white)',
    padding: '1.25rem 1.5rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--green-bg)',
    borderLeft: '4px solid var(--green-mid)',
    fontSize: '0.95rem',
    color: 'var(--dark)',
    lineHeight: 1.65,
  },
  sectionTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '2rem' },
  steps: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
  },
  step: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.5rem' },
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
  stepText: { fontSize: '0.8rem', color: 'var(--gray-text)', fontWeight: 500 },
  arrow: { fontSize: '1.5rem', color: 'var(--green-mid)', fontWeight: 700, marginBottom: '1.5rem' },

  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.5rem',
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1.5rem 3rem',
  },
  featureCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    border: '1px solid var(--green-bg)',
    textAlign: 'center' as const,
  },
  featureIcon: { fontSize: '2.5rem', marginBottom: '0.75rem' },
  featureTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.5rem',
  },
  featureDesc: { fontSize: '0.9rem', color: 'var(--gray-text)', lineHeight: 1.5 },

  contactSection: {
    textAlign: 'center' as const,
    padding: '2.5rem 1.5rem',
    background: 'var(--green-bg)',
    borderTop: '1px solid var(--green-light)',
    borderBottom: '1px solid var(--green-light)',
  },
  contactTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
    marginBottom: '0.5rem',
  },
  contactDesc: { fontSize: '0.95rem', color: 'var(--gray-text)', marginBottom: '1rem' },
  contactInfo: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },
  contactLink: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
    textDecoration: 'none',
  },
  contactDivider: { color: 'var(--gray-text)', fontSize: '1.25rem' },

  footer: {
    marginTop: 'auto',
    textAlign: 'center' as const,
    padding: '2rem 1.5rem',
    background: 'var(--green-bg-footer)',
  },
  footerTop: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '2rem',
    flexWrap: 'wrap' as const,
  },
  qrWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.375rem',
  },
  qrLabel: { fontSize: '0.7rem', color: 'var(--gray-text)', fontWeight: 500 },
  footerLinks: { display: 'flex', justifyContent: 'center', gap: '1.5rem', margin: '1rem 0' },
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
  poweredByIcon: { color: 'var(--green-mid)', flexShrink: 0 },
  footerCopy: { fontSize: '0.75rem', color: 'var(--gray-text)', opacity: 0.6 },
};
