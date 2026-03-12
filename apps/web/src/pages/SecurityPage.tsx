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
          <p style={styles.updated}>Last updated: March 10, 2026</p>

          <p style={styles.intro}>
            Security is not an afterthought at PTOWL -- it is baked into every layer of the
            stack. Here is a transparent look at how we protect your data.
          </p>

          <section style={styles.section}>
            <h2 style={styles.h2}>Encryption</h2>
            <div style={styles.grid}>
              <div style={styles.gridItem}>
                <h3 style={styles.h3}>In Transit</h3>
                <p style={styles.gridText}>
                  All data transmitted between your browser and PTOWL is encrypted using
                  TLS 1.3, the latest and most secure transport layer protocol. Every
                  connection is HTTPS -- no exceptions.
                </p>
              </div>
              <div style={styles.gridItem}>
                <h3 style={styles.h3}>At Rest</h3>
                <p style={styles.gridText}>
                  Data stored on our servers is encrypted using AES-256 encryption provided
                  by Cloudflare's infrastructure. This is the same encryption standard used
                  by governments and financial institutions worldwide.
                </p>
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Authentication</h2>
            <p style={styles.text}>
              PTOWL uses a passwordless authentication model to eliminate an entire class of
              security vulnerabilities:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Google OAuth 2.0:</strong> Delegates authentication to Google's
                battle-tested identity platform. We never see or store your Google password.
              </li>
              <li style={styles.listItem}>
                <strong>Phone SMS Verification:</strong> One-time codes sent via Firebase Auth.
                No passwords to forget, leak, or brute-force.
              </li>
            </ul>
            <p style={styles.text}>
              By not storing passwords, PTOWL is immune to credential stuffing, password
              database leaks, and weak-password attacks.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Patient Data Protection</h2>
            <div style={styles.highlight}>
              <h3 style={styles.h3Badge}>Sports Alias System</h3>
              <p style={styles.highlightText}>
                PTOWL never stores real patient names. Instead, we use a sports alias system
                that maps 676 possible two-letter initial combinations to sports figure names.
                This means your patients' identities are protected by design -- even if someone
                gained full database access, they would find "Michael Jordan" and "Serena
                Williams," not your actual patients.
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Security Headers</h2>
            <p style={styles.text}>
              Every response from PTOWL includes a comprehensive set of security headers to
              protect against common web attacks:
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
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Rate Limiting</h2>
            <p style={styles.text}>
              All API endpoints are protected by rate limiting to prevent abuse, brute-force
              attacks, and denial-of-service attempts. Limits are tuned per endpoint based on
              expected legitimate usage patterns. Authentication endpoints have stricter limits
              to protect against credential attacks.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>CSRF Protection</h2>
            <p style={styles.text}>
              PTOWL uses signed CSRF tokens with HMAC verification to prevent cross-site
              request forgery attacks. Every state-changing request is validated against a
              cryptographically signed token, ensuring that requests originate from our
              application and not from malicious third-party sites.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Infrastructure</h2>
            <p style={styles.text}>
              PTOWL runs on Cloudflare's global network, which provides:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>300+ cities worldwide</strong> -- your data is served from the nearest
                edge location for both performance and resilience
              </li>
              <li style={styles.listItem}>
                <strong>Automatic DDoS protection</strong> -- Cloudflare's network absorbs
                and mitigates distributed denial-of-service attacks before they reach our
                application
              </li>
              <li style={styles.listItem}>
                <strong>Web Application Firewall (WAF)</strong> -- filters and blocks
                malicious traffic at the edge
              </li>
              <li style={styles.listItem}>
                <strong>Isolated compute</strong> -- each request runs in its own sandboxed
                environment via Cloudflare Workers
              </li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Responsible Disclosure</h2>
            <p style={styles.text}>
              We believe in working with the security community to keep PTOWL safe. If you
              discover a security vulnerability, we want to hear about it.
            </p>
            <div style={styles.disclosureBox}>
              <h3 style={styles.h3}>How to Report</h3>
              <p style={styles.disclosureText}>
                Email security issues to{' '}
                <a href="mailto:help@ptowl.com" style={styles.inlineLink}>help@ptowl.com</a>{' '}
                with "Security" in the subject line. Please include:
              </p>
              <ul style={styles.disclosureList}>
                <li style={styles.disclosureItem}>A description of the vulnerability</li>
                <li style={styles.disclosureItem}>Steps to reproduce the issue</li>
                <li style={styles.disclosureItem}>The potential impact</li>
              </ul>
              <p style={styles.disclosureText}>
                We will acknowledge receipt within 48 hours and aim to resolve confirmed
                vulnerabilities promptly. We appreciate your help in keeping PTOWL secure and
                will credit researchers who report valid issues (with your permission).
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>Questions?</h2>
            <p style={styles.contactBlock}>
              For security questions or to report a concern, contact us at{' '}
              <a href="mailto:help@ptowl.com" style={styles.inlineLink}>help@ptowl.com</a>
              <br />
              PTOWL, LLC &middot; Virginia, USA
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
    maxWidth: '760px',
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
  disclosureList: {
    paddingLeft: '1.5rem',
    marginBottom: '0.75rem',
  },
  disclosureItem: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark-alt)',
    marginBottom: '0.25rem',
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
