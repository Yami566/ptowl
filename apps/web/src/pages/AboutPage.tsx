import { QRCodeSVG } from 'qrcode.react';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { OwlCityScene } from '../components/decorative/OwlCityScene.js';
import { PageLayout } from '../components/layout/PageLayout.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export function AboutPage() {
  usePageTitle('About');

  return (
    <PageLayout>
      <main id="main-content" style={styles.page}>
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

        {/* How we compare — honest positioning. Not "we're better at
            everything" — we name where competitors fit different jobs.
            Pairs well with Jane/WebPT for the EHR side; differentiated
            from Calendly/Cal.com (patient-initiated vs provider-batch). */}
        <section style={styles.compareSection}>
          <h2 style={styles.sectionTitle}>How PTowl compares.</h2>
          <p style={styles.compareIntro}>Honest positioning. Different tools fit different jobs.</p>
          <div style={styles.compareTableWrap}>
            <table style={styles.compareTable}>
              <thead>
                <tr>
                  <th style={styles.compareHeader}>Tool</th>
                  <th style={styles.compareHeader}>Built for</th>
                  <th style={styles.compareHeader}>Per-appointment effort</th>
                  <th style={styles.compareHeader}>Starts at</th>
                </tr>
              </thead>
              <tbody>
                <tr style={styles.compareSelf}>
                  <td style={styles.compareCell}>
                    <strong>PTowl</strong>
                  </td>
                  <td style={styles.compareCell}>
                    Therapy clinics; recurring multi-week schedules
                  </td>
                  <td style={styles.compareCell}>5 keypresses</td>
                  <td style={styles.compareCell}>Free in beta · $9 after</td>
                </tr>
                <tr>
                  <td style={styles.compareCell}>Calendly</td>
                  <td style={styles.compareCell}>Patient-initiated booking; one-off meetings</td>
                  <td style={styles.compareCell}>~10 clicks per booking</td>
                  <td style={styles.compareCell}>Free / $10+</td>
                </tr>
                <tr>
                  <td style={styles.compareCell}>Cal.com</td>
                  <td style={styles.compareCell}>Patient-initiated booking; one-off meetings</td>
                  <td style={styles.compareCell}>~10 clicks per booking</td>
                  <td style={styles.compareCell}>Free / $15+</td>
                </tr>
                <tr>
                  <td style={styles.compareCell}>Jane App</td>
                  <td style={styles.compareCell}>Full PT EHR (charts, billing, scheduling)</td>
                  <td style={styles.compareCell}>~12-20 clicks per appt</td>
                  <td style={styles.compareCell}>$54+/mo</td>
                </tr>
                <tr>
                  <td style={styles.compareCell}>WebPT</td>
                  <td style={styles.compareCell}>Full PT EHR (charts, billing, scheduling)</td>
                  <td style={styles.compareCell}>~15-20 clicks per appt</td>
                  <td style={styles.compareCell}>$99+/mo</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={styles.compareNote}>
            PTowl pairs well with Jane / WebPT — let your EHR handle billing and charts; let PTowl
            handle the 5-keypress recurring schedules and patient magic-link share. Cal.com /
            Calendly are different products entirely (patient picks a slot, not provider generates a
            recurring series).
          </p>
        </section>

        {/* Pricing preview — honest, forward-looking. Beta is free.
            Here's what comes AFTER beta so visitors know we have a
            plan and aren't going to bait-and-switch. Disarms
            "will this become expensive?" anxiety up-front. */}
        <section style={styles.pricingSection}>
          <h2 style={styles.sectionTitle}>What this will cost (when it costs anything).</h2>
          <p style={styles.pricingIntro}>
            PTowl is <strong>free during beta</strong> and stays free until we have 50 active
            clinics using it weekly. After that, paid tiers turn on for new accounts. Existing free
            users get advance notice and continued access.
          </p>
          <div style={styles.pricingGrid}>
            <div style={styles.pricingCard}>
              <h3 style={styles.pricingTier}>Free</h3>
              <div style={styles.pricingPrice}>
                $0<span style={styles.pricingPer}>/mo</span>
              </div>
              <ul style={styles.pricingFeatures}>
                <li>Up to 3 active patients</li>
                <li>All scheduling features</li>
                <li>Sports-alias privacy</li>
                <li>Patient magic-link share</li>
              </ul>
            </div>
            <div style={{ ...styles.pricingCard, ...styles.pricingCardFeatured }}>
              <h3 style={styles.pricingTier}>Solo</h3>
              <div style={styles.pricingPrice}>
                $9<span style={styles.pricingPer}>/mo</span>
              </div>
              <ul style={styles.pricingFeatures}>
                <li>Unlimited patients</li>
                <li>Everything in Free</li>
                <li>Email reminders</li>
                <li>Custom clinic logo</li>
              </ul>
            </div>
            <div style={styles.pricingCard}>
              <h3 style={styles.pricingTier}>Clinic</h3>
              <div style={styles.pricingPrice}>
                $29<span style={styles.pricingPer}>/mo per provider</span>
              </div>
              <ul style={styles.pricingFeatures}>
                <li>Multi-provider dashboard</li>
                <li>Everything in Solo</li>
                <li>Analytics</li>
                <li>Priority support</li>
              </ul>
            </div>
          </div>
          <p style={styles.pricingNote}>
            Pricing locks the day we hit 50 active clinics. Until then, every account is free and
            &ldquo;I personally read every email&rdquo; is the support tier.
          </p>
        </section>

        {/* What's coming — honest mini-roadmap. Three items, on-brand
            voice. Doesn't overpromise; flags what's NOT yet shipped. */}
        <section style={styles.roadmapSection}>
          <h2 style={styles.sectionTitle}>What&rsquo;s coming next.</h2>
          <p style={styles.roadmapIntro}>
            Three things on the immediate roadmap. Honest about what is and isn&rsquo;t built.
          </p>
          <ol style={styles.roadmapList}>
            <li style={styles.roadmapItem}>
              <strong>Auto-email patient magic-link.</strong> Today providers manually share the
              <code> /p/&lt;token&gt;</code> URL via text or whatever channel works. Next: when you
              add the patient&rsquo;s email, we send them the link automatically with the schedule
              attached.
            </li>
            <li style={styles.roadmapItem}>
              <strong>Multi-provider clinics.</strong> One account, multiple therapists, shared
              templates and patient lists. Today PTowl is best for solo providers or front-desk
              staff scheduling on behalf of one provider.
            </li>
            <li style={styles.roadmapItem}>
              <strong>AI-assisted schedule drafting.</strong> Describe the patient in plain English
              (&ldquo;new ACL repair, post-op week 2, prefers mornings&rdquo;) and PTowl picks the
              right preset and frequency. The Cloudflare AI binding is wired; the prompt isn&rsquo;t
              shipped yet.
            </li>
          </ol>
          <p style={styles.roadmapNote}>
            None of this is hidden behind enterprise sales. As features ship they hit every account.
            Free during beta covers everything; paid tiers (later) gate volume not features.
          </p>
        </section>

        {/* FAQ — clinician-facing, plain-language. Five high-leverage
            questions visitors actually ask. Drawn from the SHOW-HN
            comment defenses but tuned for clinic owners (less tech-
            speak, more "what does this mean for my Tuesday morning"). */}
        <section style={styles.faqSection}>
          <h2 style={styles.sectionTitle}>Common questions</h2>
          <div style={styles.faqList}>
            <details style={styles.faqItem}>
              <summary style={styles.faqQ}>Is PTowl HIPAA-compliant?</summary>
              <p style={styles.faqA}>
                No, on purpose. PTowl is built so real patient names <em>never enter the system</em>
                . You type two-letter initials and we map them to a sports figure alias for display
                and printing. Because PHI never gets stored, the HIPAA data-protection rules that
                apply to systems that DO store PHI don&rsquo;t apply to PTowl&rsquo;s data layer.
                Treat PTowl as a scheduling and printing helper, not as a system of record. Your EHR
                stays the EHR.
              </p>
            </details>
            <details style={styles.faqItem}>
              <summary style={styles.faqQ}>What does it cost?</summary>
              <p style={styles.faqA}>
                Free during beta. No credit card. No 30-day clock. We&rsquo;ll introduce paid plans
                only after we have at least 50 active beta clinics — and existing free users get
                advance notice and continued access. Future pricing target: $9/month for solo
                providers, $29/month per provider for clinics.
              </p>
            </details>
            <details style={styles.faqItem}>
              <summary style={styles.faqQ}>How does the patient see their schedule?</summary>
              <p style={styles.faqA}>
                After you generate a schedule, click <strong>Share → Send to patient</strong>. PTowl
                mints a private URL like <code>ptowl.com/p/&lt;long-token&gt;</code> and copies it
                to your clipboard (or opens your phone&rsquo;s share sheet on mobile). Text it,
                email it, hand it on a sticky note — whatever channel you&rsquo;d already use. The
                patient opens the link, sees a clean mobile-first appointment list with their sports
                alias on top, and taps &ldquo;Add to my calendar&rdquo; to drop the appointments
                into Apple Calendar, Google Calendar, or Outlook.
              </p>
            </details>
            <details style={styles.faqItem}>
              <summary style={styles.faqQ}>Can I print? Does it match our clinic branding?</summary>
              <p style={styles.faqA}>
                Yes. Print preview uses your browser&rsquo;s print dialog (works on any printer,
                Letter or A4). The header shows your clinic name + optional logo URL (configurable
                under Profile). Print settings are configurable under Profile → Print: hide the
                header, hide the reminder column, switch language to Spanish, etc.
              </p>
            </details>
            <details style={styles.faqItem}>
              <summary style={styles.faqQ}>What happens to our data if PTowl shuts down?</summary>
              <p style={styles.faqA}>
                Your data is yours. From your profile you can export schedules to iCal anytime —
                drops cleanly into Apple Calendar, Google Calendar, or Outlook. If we ever wind
                down, we&rsquo;d give 90 days&rsquo; notice and provide a final bulk export. We
                don&rsquo;t plan on disappearing quietly.
              </p>
            </details>
          </div>
        </section>

        {/* Contact */}
        <section style={styles.contactSection}>
          <h2 style={styles.contactTitle}>Get in Touch</h2>
          <p style={styles.contactDesc}>For sales or partnership inquiries:</p>
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
  faqSection: {
    padding: '2.5rem 1.5rem',
    maxWidth: '760px',
    margin: '0 auto',
    textAlign: 'left' as const,
  },
  faqList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  faqItem: {
    background: 'var(--white)',
    padding: '1rem 1.25rem',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--green-bg)',
  },
  faqQ: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--green-dark)',
    cursor: 'pointer',
    listStyle: 'none' as const,
  },
  faqA: {
    fontSize: '0.95rem',
    color: 'var(--dark)',
    lineHeight: 1.65,
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid var(--green-bg)',
  },
  // ── Pricing preview ──
  pricingSection: {
    padding: '3rem 1.5rem',
    maxWidth: '960px',
    margin: '0 auto',
    textAlign: 'center' as const,
  },
  pricingIntro: {
    fontSize: '1rem',
    color: 'var(--gray-text)',
    lineHeight: 1.6,
    maxWidth: '640px',
    margin: '0 auto 2rem',
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
    marginBottom: '1.5rem',
  },
  pricingCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    border: '2px solid var(--green-bg)',
    textAlign: 'left' as const,
  },
  pricingCardFeatured: {
    border: '2px solid var(--green-mid)',
    boxShadow: '0 4px 16px rgba(76, 175, 80, 0.15)',
  },
  pricingTier: {
    fontSize: '0.9rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginBottom: '0.5rem',
  },
  pricingPrice: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--dark)',
    fontFamily: 'var(--font-mono)',
    marginBottom: '1rem',
  },
  pricingPer: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--gray-text)',
    fontFamily: 'var(--font-body)',
    marginLeft: '0.25rem',
  },
  pricingFeatures: {
    listStyle: 'none' as const,
    padding: 0,
    margin: 0,
    fontSize: '0.875rem',
    color: 'var(--dark)',
    lineHeight: 1.8,
  },
  pricingNote: {
    fontSize: '0.875rem',
    color: 'var(--gray-text)',
    fontStyle: 'italic' as const,
    maxWidth: '640px',
    margin: '0 auto',
  },
  // ── How we compare ──
  compareSection: {
    padding: '3rem 1.5rem',
    maxWidth: '960px',
    margin: '0 auto',
    textAlign: 'center' as const,
  },
  compareIntro: {
    fontSize: '1rem',
    color: 'var(--gray-text)',
    lineHeight: 1.6,
    marginBottom: '1.5rem',
  },
  compareTableWrap: {
    overflowX: 'auto' as const,
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--green-bg)',
    background: 'var(--white)',
  },
  compareTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.875rem',
    textAlign: 'left' as const,
  },
  compareHeader: {
    padding: '0.75rem 1rem',
    background: 'var(--green-bg)',
    color: 'var(--green-dark)',
    fontWeight: 700,
    fontSize: '0.75rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--green-light)',
  },
  compareCell: {
    padding: '0.75rem 1rem',
    color: 'var(--dark)',
    borderTop: '1px solid var(--green-bg)',
    verticalAlign: 'top' as const,
  },
  compareSelf: {
    background: 'var(--green-bg-footer)',
  },
  compareNote: {
    fontSize: '0.875rem',
    color: 'var(--gray-text)',
    lineHeight: 1.65,
    fontStyle: 'italic' as const,
    maxWidth: '720px',
    margin: '1.25rem auto 0',
    textAlign: 'left' as const,
  },
  // ── What's coming next (mini roadmap) ──
  roadmapSection: {
    padding: '3rem 1.5rem',
    maxWidth: '760px',
    margin: '0 auto',
    textAlign: 'left' as const,
  },
  roadmapIntro: {
    fontSize: '1rem',
    color: 'var(--gray-text)',
    lineHeight: 1.6,
    marginBottom: '1.5rem',
  },
  roadmapList: {
    paddingLeft: '1.5rem',
    margin: 0,
  },
  roadmapItem: {
    fontSize: '0.95rem',
    color: 'var(--dark)',
    lineHeight: 1.7,
    marginBottom: '1rem',
  },
  roadmapNote: {
    fontSize: '0.875rem',
    color: 'var(--gray-text)',
    fontStyle: 'italic' as const,
    marginTop: '1.25rem',
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
