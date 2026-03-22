import { Link } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';

export function PrivacyPolicyPage() {
  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.container}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <OwlLogo size="sm" linkTo="/" />
          <Link to="/dashboard" style={styles.backLink}>
            &larr; Back to Dashboard
          </Link>
        </div>

        <div style={styles.card}>
          <h1 style={styles.h1}>Privacy Policy</h1>
          <p style={styles.updated}>Last updated: March 21, 2026</p>

          <p style={styles.intro}>
            We keep it simple, Jack. Patient Owl was designed from day one so that sensitive
            patient information never touches our servers. This policy explains exactly what
            we collect, what we don't, and why our approach to privacy is different.
          </p>

          <section style={styles.section}>
            <h2 style={styles.h2}>Our Privacy Philosophy: Privacy by Design</h2>
            <div style={styles.highlight}>
              <p style={styles.highlightText}>
                Most healthcare tools collect sensitive data and then try to protect it.
                We took the opposite approach: <strong>we designed Patient Owl so that
                protected health information (PHI) is never stored in the first place.</strong>{' '}
                You cannot breach what does not exist. This is the foundation of everything
                we build.
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>1. What We Collect</h2>
            <p style={styles.text}>
              We collect only the minimum information needed to provide our scheduling service:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Account information:</strong> Your phone number for authentication
                via SMS verification (Firebase Auth). Optionally, your name and email if
                you choose to provide them.
              </li>
              <li style={styles.listItem}>
                <strong>Clinic details:</strong> Clinic name, address, phone, and email that you
                choose to add to your profile for printed schedule headers.
              </li>
              <li style={styles.listItem}>
                <strong>Schedule data:</strong> Appointment dates, times, and scheduling preferences.
                Patient identity is stored only as two-letter initials, which are immediately mapped
                to our proprietary de-identification system.
              </li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>2. What We Do NOT Collect</h2>
            <div style={styles.highlight}>
              <h3 style={styles.h3}>Proprietary De-Identification Methodology</h3>
              <p style={styles.highlightText}>
                Patient Owl uses a proprietary de-identification methodology that replaces
                patient identities with sports figure aliases at the point of entry. When a
                provider types two initials, the system immediately maps them to an alias
                (e.g., "MJ" becomes "Michael Jordan"). The real patient name is never entered,
                transmitted, or stored anywhere in our system. This methodology ensures that
                even in the unlikely event of a data breach, no real patient identities would
                be exposed — because they were never there.
              </p>
            </div>
            <p style={styles.text}>We also do not collect:</p>
            <ul style={styles.list}>
              <li style={styles.listItem}>Real patient names — only two-letter initials, immediately de-identified</li>
              <li style={styles.listItem}>Medical records, diagnoses, or treatment plans</li>
              <li style={styles.listItem}>Insurance or billing information</li>
              <li style={styles.listItem}>Social Security numbers or government IDs</li>
              <li style={styles.listItem}>Any information that could identify a patient by name</li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>3. HIPAA & Healthcare Privacy</h2>
            <div style={styles.hipaaBox}>
              <h3 style={styles.h3}>Privacy by Design — Not Privacy by Compliance</h3>
              <p style={styles.text}>
                Patient Owl's architecture was built around a simple principle: the most secure
                data is data you never collect. Because our proprietary de-identification
                methodology ensures that real patient names and protected health information
                are never stored in our system, the traditional HIPAA data protection requirements
                that apply to systems holding PHI are largely not applicable to Patient Owl's
                data layer.
              </p>
              <p style={styles.text}>
                This is not a workaround — it is a deliberate design decision. We believe healthcare
                tools should be simple, fast, and private by default. You should not need a
                200-page compliance manual to print a schedule.
              </p>
              <p style={{ ...styles.text, marginBottom: 0 }}>
                That said, healthcare providers are responsible for their own compliance with
                applicable regulations. If you have specific compliance questions about your
                use of Patient Owl, we are happy to discuss your needs at{' '}
                <a href="mailto:help@ptowl.com" style={styles.inlineLink}>help@ptowl.com</a>.
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>4. Authentication</h2>
            <p style={styles.text}>
              Patient Owl uses passwordless authentication — you sign in with your phone number
              and a one-time SMS code. We do not store passwords. Authentication is managed
              through Firebase Auth with industry-standard security protocols. This eliminates
              an entire class of security risks including credential stuffing, password leaks,
              and weak-password attacks.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>5. Cookies & Tracking</h2>
            <p style={styles.text}>
              We keep it simple: Patient Owl does not use tracking cookies. We do not use
              third-party analytics that track individual users. Session cookies are used solely
              to keep you logged in, and they are httpOnly and secure — meaning they cannot be
              accessed by JavaScript or sent over unencrypted connections.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>6. Data Storage & Security</h2>
            <p style={styles.text}>
              Your data is stored on Cloudflare's global infrastructure, which provides:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>Encryption in transit (TLS 1.3)</li>
              <li style={styles.listItem}>Encryption at rest (AES-256)</li>
              <li style={styles.listItem}>Global edge network across 300+ cities</li>
              <li style={styles.listItem}>Automatic DDoS protection and threat mitigation</li>
            </ul>
            <p style={styles.text}>
              For a detailed breakdown of our security practices, see our{' '}
              <Link to="/security" style={styles.inlineLink}>Security page</Link>.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>7. Data Sharing</h2>
            <p style={styles.text}>
              We do not sell, rent, or trade your personal information. Period. We share data
              only with the infrastructure providers necessary to operate the service:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Cloudflare</strong> — hosting and infrastructure
              </li>
              <li style={styles.listItem}>
                <strong>Firebase (Google)</strong> — authentication
              </li>
              <li style={styles.listItem}>
                <strong>Legal requirements</strong> — we may disclose information if required by
                law, court order, or governmental regulation
              </li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>8. Your Rights & Data Deletion</h2>
            <p style={styles.text}>
              You have the right to access, correct, or delete your data at any time. To request
              data export or account deletion, email us at{' '}
              <a href="mailto:help@ptowl.com" style={styles.inlineLink}>help@ptowl.com</a>.
              We will process deletion requests within 30 days.
            </p>
            <p style={styles.text}>
              When your account is deleted, all associated schedule data, clinic information, and
              profile details are permanently removed from our systems.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>9. Changes to This Policy</h2>
            <p style={styles.text}>
              We may update this privacy policy from time to time. When we do, we will update the
              "Last updated" date at the top of this page. Continued use of Patient Owl after
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>10. Contact Us</h2>
            <p style={styles.text}>
              Questions about this privacy policy? We are happy to help.
            </p>
            <p style={styles.contactBlock}>
              Email:{' '}
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
    maxWidth: 'clamp(320px, 92vw, 960px)',
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
  text: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark-alt)',
    marginBottom: '0.75rem',
  },
  highlightText: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark-alt)',
    marginBottom: 0,
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
  highlight: {
    background: 'var(--green-light)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem',
    marginBottom: '1rem',
    borderLeft: '3px solid var(--green-mid)',
  },
  hipaaBox: {
    background: 'var(--green-light)',
    borderRadius: 'var(--radius)',
    padding: '1.5rem',
    borderLeft: '3px solid var(--green-dark)',
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
