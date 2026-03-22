import { QRCodeSVG } from 'qrcode.react';
import { OwlLogo } from '../components/layout/OwlLogo.js';
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
        <img
          src="/logo-120.svg"
          alt="Patient Owl"
          style={{ width: 'clamp(64px, 15vw, 100px)', height: 'auto', marginBottom: '0.75rem' }}
        />
        <h1 style={styles.headline}>Built to make healthcare more simple and fun.</h1>
        <p style={styles.subheadline}>
          Patient Owl exists for the people who show up every day to help others move
          better. We keep the tools simple so you can focus on what matters.
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
        <h2 style={styles.sectionTitle}>4 keypresses. That's it. <span style={{ opacity: 0.55, fontWeight: 400, fontStyle: 'italic' }}>Okay, maybe five.</span></h2>
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
            <span style={{ ...styles.key, borderStyle: 'dashed', opacity: 0.55, transform: 'rotate(-2deg)' }}>&#9749;</span>
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
            Make your own templates, use premade templates, switch your layout!
            Hotkeys, drag-and-drop, full control — your clinic runs your way.
          </p>
        </div>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>&#128029;</div>
          <h3 style={styles.featureTitle}>Schedulize your life</h3>
          <p style={styles.featureDesc}>
            Because life is a bee.. buzzing from patient to patient,
            appointment to appointment. Let us handle the hive.
          </p>
        </div>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>&#128274;</div>
          <h3 style={styles.featureTitle}>Private by Design</h3>
          <p style={styles.featureDesc}>
            Patient names never enter our system. Our proprietary de-identification
            methodology turns initials into sports legends on screen. If the data
            doesn't exist, it can't be breached.
          </p>
        </div>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>&#128197;</div>
          <h3 style={styles.featureTitle}>Calendar View</h3>
          <p style={styles.featureDesc}>
            See schedules as a full interactive calendar. Month, week, or day —
            drag appointments around and watch everything update.
          </p>
        </div>
        <div style={styles.featureCard}>
          <div style={styles.featureIcon}>&#128424;</div>
          <h3 style={styles.featureTitle}>Share & Print</h3>
          <p style={styles.featureDesc}>
            QR codes, shareable links, and print-ready layouts with your clinic
            branding. Hand it to patients or text them a link.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section style={styles.contactSection}>
        <h2 style={styles.contactTitle}>Get in Touch</h2>
        <p style={styles.contactDesc}>
          For sales, commercial licensing, or partnership inquiries:
        </p>
        <div style={styles.contactInfo}>
          <a href="tel:+17034009900" style={styles.contactLink}>703-400-9900</a>
          <span style={styles.contactDivider}>&middot;</span>
          <a href="mailto:help@ptowl.com" style={styles.contactLink}>help@ptowl.com</a>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer}>
        <div style={styles.footerTop}>
          <OwlLogo size="sm" linkTo="/" />
          <div style={styles.qrWrap}>
            <QRCodeSVG value="https://ptowl.com" size={80} fgColor="#1B5E20" bgColor="transparent" />
            <span style={styles.qrLabel}>Scan to try on mobile</span>
          </div>
        </div>
        <div style={styles.footerLinks}>
          <a href="/privacy" style={styles.footerLink}>Privacy</a>
          <a href="/terms" style={styles.footerLink}>Terms</a>
          <a href="/security" style={styles.footerLink}>Security</a>
        </div>
        <p style={styles.footerCopy}>
          &copy; 2026 Patient Owl &middot; A product of Moose Bay &amp; Company LLC
        </p>
      </footer>
    </main>
    </PageLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  header: { display: 'flex', justifyContent: 'center', padding: '1.5rem', background: 'var(--white)', borderBottom: '1px solid var(--gray-mid)' },
  hero: { textAlign: 'center' as const, padding: '3rem 1.5rem 2rem', maxWidth: '700px', margin: '0 auto' },
  headline: { fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, color: 'var(--dark)', lineHeight: 1.2, marginBottom: '0.75rem' },
  subheadline: { fontSize: '1rem', color: 'var(--gray-text)', lineHeight: 1.6 },

  statsRow: { display: 'flex', justifyContent: 'center', gap: 'clamp(1rem, 3vw, 3rem)', flexWrap: 'wrap' as const, padding: '2rem 1.5rem', maxWidth: '960px', margin: '0 auto' },
  statItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.25rem' },
  statValue: { fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--green-dark)' },
  statLabel: { fontSize: '0.75rem', fontWeight: 500, color: 'var(--gray-text)', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },

  howSection: { textAlign: 'center' as const, padding: '3rem 1.5rem', maxWidth: '960px', margin: '0 auto' },
  sectionTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '2rem' },
  steps: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' as const },
  step: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.5rem' },
  key: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '3.5rem', height: '3.5rem', background: 'var(--white)', border: '2px solid var(--green-mid)', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1rem', color: 'var(--green-dark)', boxShadow: '0 3px 0 var(--green-mid)' },
  stepText: { fontSize: '0.8rem', color: 'var(--gray-text)', fontWeight: 500 },
  arrow: { fontSize: '1.5rem', color: 'var(--green-mid)', fontWeight: 700, marginBottom: '1.5rem' },

  features: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem 3rem' },
  featureCard: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid var(--green-bg)', textAlign: 'center' as const },
  featureIcon: { fontSize: '2.5rem', marginBottom: '0.75rem' },
  featureTitle: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.5rem' },
  featureDesc: { fontSize: '0.9rem', color: 'var(--gray-text)', lineHeight: 1.5 },

  contactSection: { textAlign: 'center' as const, padding: '2.5rem 1.5rem', background: 'var(--green-bg)', borderTop: '1px solid var(--green-light)', borderBottom: '1px solid var(--green-light)' },
  contactTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--green-dark)', marginBottom: '0.5rem' },
  contactDesc: { fontSize: '0.95rem', color: 'var(--gray-text)', marginBottom: '1rem' },
  contactInfo: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' as const },
  contactLink: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--green-dark)', textDecoration: 'none' },
  contactDivider: { color: 'var(--gray-text)', fontSize: '1.25rem' },

  footer: { marginTop: 'auto', textAlign: 'center' as const, padding: '2rem 1.5rem', background: 'var(--green-bg-footer)' },
  footerTop: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' as const },
  qrWrap: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '0.375rem' },
  qrLabel: { fontSize: '0.7rem', color: 'var(--gray-text)', fontWeight: 500 },
  footerLinks: { display: 'flex', justifyContent: 'center', gap: '1.5rem', margin: '1rem 0' },
  footerLink: { fontSize: '0.85rem', color: 'var(--gray-text)', textDecoration: 'none', padding: '0.5rem 0.75rem', display: 'inline-block' },
  footerCopy: { fontSize: '0.75rem', color: 'var(--gray-text)', opacity: 0.6 },
};
