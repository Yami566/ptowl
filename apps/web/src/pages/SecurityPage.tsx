import { Link } from 'react-router-dom';

export function SecurityPage() {
  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.container}>
        <Link to="/dashboard" style={styles.backLink}>
          &larr; Back to Dashboard
        </Link>

        <div style={styles.card}>
          <h1 style={styles.h1}>Security</h1>
          <p style={styles.updated}>Last updated: March 21, 2026</p>

          <p style={styles.intro}>
            Security is not an afterthought at Patient Owl — it is baked into every layer
            of the stack. Here is a transparent look at how we protect your data, and more
            importantly, how we designed the system so there is less to protect in the first place.
          </p>

          <section style={styles.section}>
            <h2 style={styles.h2}>Privacy by Design</h2>
            <div style={styles.highlight}>
              <p style={styles.highlightText}>
                The most secure data is data that was never collected. Patient Owl is architected
                around this principle. Our proprietary de-identification methodology ensures that
                real patient names and protected health information are never stored in our system.
                We do not collect diagnoses, treatment plans, insurance details, or any clinical records.
                This means the traditional attack surface that healthcare software must defend against
                simply does not exist in Patient Owl.
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>De-Identification Methodology</h2>
            <div style={styles.methodBox}>
              <h3 style={styles.h3Badge}>Proprietary Patient De-Identification</h3>
              <p style={styles.methodText}>
                Patient Owl replaces patient identities with sports figure aliases at the point
                of entry. Providers enter only two-letter initials, which are immediately and
                irreversibly mapped to an alias from our curated dataset of 676 combinations.
                The real patient name is never entered into the system, never transmitted over
                the network, and never stored in our database. On screen, in exports, and in
                admin logs — only the alias is visible.
              </p>
              <p style={styles.methodText}>
                This is not masking or encryption — it is structural de-identification. The
                sensitive data does not exist in our system because it was never introduced.
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>HIPAA Positioning</h2>
            <p style={styles.text}>
              Patient Owl was designed so that the protected health information (PHI) traditionally
              handled by healthcare scheduling tools is architecturally excluded from our data layer.
              Because real patient names are never stored and no clinical data is collected, the
              HIPAA data protection requirements that apply to systems holding PHI are largely
              not applicable to Patient Owl's stored data.
            </p>
            <p style={styles.text}>
              We believe this is a better approach than collecting sensitive data and then building
              walls around it. We keep it simple: if the data does not exist, it cannot be breached.
            </p>
            <p style={styles.textNote}>
              Healthcare providers remain responsible for their own regulatory compliance. If you
              have questions about how Patient Owl fits into your compliance framework, contact us
              at <a href="mailto:help@ptowl.com" style={styles.inlineLink}>help@ptowl.com</a>.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Encryption</h2>
            <div style={styles.grid}>
              <div style={styles.gridItem}>
                <h3 style={styles.h3}>In Transit</h3>
                <p style={styles.gridText}>
                  All data transmitted between your browser and Patient Owl is encrypted using
                  TLS 1.3, the latest and most secure transport layer protocol. Every
                  connection is HTTPS — no exceptions.
                </p>
              </div>
              <div style={styles.gridItem}>
                <h3 style={styles.h3}>At Rest</h3>
                <p style={styles.gridText}>
                  Data stored on our infrastructure is encrypted using AES-256 encryption provided
                  by Cloudflare. This is the same encryption standard used by governments and
                  financial institutions worldwide.
                </p>
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Authentication</h2>
            <p style={styles.text}>
              Patient Owl uses a passwordless authentication model to eliminate an entire class of
              security vulnerabilities:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Phone SMS Verification:</strong> One-time codes sent via Firebase Auth.
                No passwords to forget, leak, or brute-force.
              </li>
              <li style={styles.listItem}>
                <strong>Multi-Factor Authentication:</strong> Available for accounts requiring
                additional security layers.
              </li>
              <li style={styles.listItem}>
                <strong>Admin 2FA:</strong> Administrative access requires email-based two-factor
                verification on every session.
              </li>
            </ul>
            <p style={styles.text}>
              By not storing passwords, Patient Owl is immune to credential stuffing, password
              database leaks, and weak-password attacks.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Security Headers</h2>
            <p style={styles.text}>
              Every response from Patient Owl includes a comprehensive set of security headers:
            </p>
            <div style={styles.headerTable}>
              <div style={styles.headerRow}>
                <span style={styles.headerName}>Strict-Transport-Security (HSTS)</span>
                <span style={styles.headerDesc}>Forces browsers to only connect via HTTPS</span>
              </div>
              <div style={styles.headerRow}>
                <span style={styles.headerName}>Content-Security-Policy (CSP)</span>
                <span style={styles.headerDesc}>Prevents XSS and code injection attacks</span>
              </div>
              <div style={styles.headerRow}>
                <span style={styles.headerName}>X-Frame-Options: DENY</span>
                <span style={styles.headerDesc}>Blocks clickjacking by preventing framing</span>
              </div>
              <div style={styles.headerRow}>
                <span style={styles.headerName}>X-Content-Type-Options</span>
                <span style={styles.headerDesc}>Prevents MIME-type sniffing attacks</span>
              </div>
              <div style={styles.headerRow}>
                <span style={styles.headerName}>Referrer-Policy</span>
                <span style={styles.headerDesc}>Controls information sent in referrer headers</span>
              </div>
              <div style={styles.headerRow}>
                <span style={styles.headerName}>Permissions-Policy</span>
                <span style={styles.headerDesc}>Disables camera, microphone, geolocation, and payment APIs</span>
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Rate Limiting & Bot Protection</h2>
            <p style={styles.text}>
              All API endpoints are protected by rate limiting at the edge via Cloudflare's
              Web Application Firewall. Authentication endpoints have stricter limits to protect
              against brute-force attacks. Bot protection is provided by Cloudflare Turnstile —
              invisible to legitimate users, effective against automated threats.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>CSRF Protection</h2>
            <p style={styles.text}>
              Patient Owl uses signed CSRF tokens with HMAC-SHA256 verification to prevent
              cross-site request forgery attacks. Every state-changing request is validated
              against a cryptographically signed token with constant-time comparison to prevent
              timing attacks.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Infrastructure</h2>
            <p style={styles.text}>
              Patient Owl runs entirely on Cloudflare's global edge network:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>300+ cities worldwide</strong> — data served from the nearest edge
                location for performance and resilience
              </li>
              <li style={styles.listItem}>
                <strong>Automatic DDoS protection</strong> — network-level attack mitigation
                before traffic reaches our application
              </li>
              <li style={styles.listItem}>
                <strong>Web Application Firewall (WAF)</strong> — filters and blocks malicious
                traffic at the edge
              </li>
              <li style={styles.listItem}>
                <strong>Isolated compute</strong> — each request runs in its own sandboxed
                environment via Cloudflare Workers
              </li>
              <li style={styles.listItem}>
                <strong>Automated data hygiene</strong> — expired tokens, sessions, and logs are
                automatically cleaned on a daily schedule
              </li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Responsible Disclosure</h2>
            <p style={styles.text}>
              We believe in working with the security community to keep Patient Owl safe. If you
              discover a security vulnerability, we want to hear about it.
            </p>
            <div style={styles.disclosureBox}>
              <h3 style={styles.h3}>How to Report</h3>
              <p style={styles.disclosureText}>
                Email security issues to{' '}
                <a href="mailto:help@ptowl.com" style={styles.inlineLink}>help@ptowl.com</a>{' '}
                with "Security" in the subject line. Please include a description of the
                vulnerability, steps to reproduce, and the potential impact.
              </p>
              <p style={styles.disclosureText}>
                We will acknowledge receipt within 48 hours and aim to resolve confirmed
                vulnerabilities promptly. We appreciate your help and will credit researchers
                who report valid issues (with your permission).
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Questions?</h2>
            <p style={styles.contactBlock}>
              For security questions or to report a concern, contact us at{' '}
              <a href="mailto:help@ptowl.com" style={styles.inlineLink}>help@ptowl.com</a>
              <br />
              Patient Owl is a product of Moose Bay &amp; Company LLC &middot; Virginia, USA
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'var(--off-white)',
    padding: '2rem 1rem',
  },
  container: {
    maxWidth: 'clamp(600px, 50vw, 960px)',
    margin: '0 auto',
  },
  backLink: {
    display: 'inline-block',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--green-mid)',
    textDecoration: 'none',
  },
  card: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2.5rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  h1: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.25rem',
  },
  updated: {
    fontSize: '0.8125rem',
    color: 'var(--gray-text)',
    marginBottom: '1.75rem',
  },
  intro: {
    fontSize: '1rem',
    lineHeight: 1.7,
    color: 'var(--dark)',
    marginBottom: '2rem',
    borderLeft: '3px solid var(--green-mid)',
    paddingLeft: '1rem',
  },
  section: {
    marginBottom: '2rem',
  },
  h2: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: 'var(--dark)',
    marginBottom: '0.75rem',
  },
  h3: {
    fontSize: '1rem',
    fontWeight: 600,
    color: 'var(--green-dark)',
    marginBottom: '0.5rem',
  },
  h3Badge: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  text: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark-alt)',
    marginBottom: '0.75rem',
  },
  textNote: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--gray-text)',
    fontStyle: 'italic',
    marginBottom: '0.75rem',
  },
  list: {
    paddingLeft: '1.5rem',
    marginBottom: '0.75rem',
  },
  listItem: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark-alt)',
    marginBottom: '0.5rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
    marginBottom: '0.75rem',
  },
  gridItem: {
    background: 'var(--gray-light)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem',
  },
  gridText: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
    color: 'var(--dark-alt)',
    marginBottom: 0,
  },
  highlight: {
    background: 'var(--green-light)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    marginBottom: '1rem',
    borderLeft: '3px solid var(--green-mid)',
  },
  highlightText: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark-alt)',
    marginBottom: 0,
  },
  methodBox: {
    background: 'var(--green-light)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    marginBottom: '1rem',
    borderLeft: '3px solid var(--green-dark)',
  },
  methodText: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark-alt)',
    marginBottom: '0.75rem',
  },
  headerTable: {
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    border: '1px solid var(--gray-mid)',
    marginBottom: '0.75rem',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    borderBottom: '1px solid var(--gray-mid)',
    gap: '1rem',
  },
  headerName: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--dark)',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  headerDesc: {
    fontSize: '0.8125rem',
    color: 'var(--gray-text)',
    textAlign: 'right' as const,
  },
  disclosureBox: {
    background: 'var(--orange-light)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    borderLeft: '3px solid var(--orange-mid)',
  },
  disclosureText: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark-alt)',
    marginBottom: '0.5rem',
  },
  inlineLink: {
    color: 'var(--green-mid)',
    fontWeight: 500,
    textDecoration: 'underline',
  },
  contactBlock: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark-alt)',
    background: 'var(--gray-light)',
    borderRadius: 'var(--radius)',
    padding: '1rem',
  },
};
