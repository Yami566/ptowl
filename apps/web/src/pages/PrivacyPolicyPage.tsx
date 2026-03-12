import { Link } from 'react-router-dom';

export function PrivacyPolicyPage() {
  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.container}>
        <Link to="/dashboard" style={styles.backLink}>
          &larr; Back to Dashboard
        </Link>

        <div style={styles.card}>
          <h1 style={styles.h1}>Privacy Policy</h1>
          <p style={styles.updated}>Last updated: March 10, 2026</p>

          <p style={styles.intro}>
            At PTOWL, we take your privacy seriously -- almost as seriously as we take
            fast schedule printing. This policy explains what data we collect, how we
            use it, and the lengths we go to so your information stays safe.
          </p>

          <section style={styles.section}>
            <h2 style={styles.h2}>1. What We Collect</h2>
            <p style={styles.text}>
              We collect only the minimum information needed to provide our scheduling service:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Account information:</strong> Your name, email address, and phone number
                provided during authentication via Google Sign-In or phone SMS (Firebase Auth).
              </li>
              <li style={styles.listItem}>
                <strong>Clinic details:</strong> Clinic name, address, phone, and email that you
                choose to add to your profile for printed schedules.
              </li>
              <li style={styles.listItem}>
                <strong>Schedule data:</strong> The schedules you create, including time slots,
                template selections, and scheduling preferences.
              </li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>2. What We Do NOT Collect</h2>
            <div style={styles.highlight}>
              <h3 style={styles.h3}>No Real Patient Names</h3>
              <p style={styles.text}>
                PTOWL uses a sports alias system for patient identification. Real patient names
                are never stored in our database. Instead, patient initials are mapped to
                sports figure aliases (e.g., "MJ" might display as "Michael Jordan"). This
                design decision means that even in the unlikely event of a data breach, no
                real patient names would be exposed.
              </p>
            </div>
            <ul style={styles.list}>
              <li style={styles.listItem}>We do not collect medical records, diagnoses, or treatment plans.</li>
              <li style={styles.listItem}>We do not collect insurance or billing information.</li>
              <li style={styles.listItem}>We do not collect Social Security numbers or government IDs.</li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>3. Authentication</h2>
            <p style={styles.text}>
              PTOWL uses Firebase Authentication to manage sign-in. We support two methods:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Google Sign-In:</strong> We receive your name, email, and profile photo
                from Google. We do not receive or store your Google password.
              </li>
              <li style={styles.listItem}>
                <strong>Phone SMS:</strong> We use your phone number to send a one-time
                verification code. We do not store SMS message content.
              </li>
            </ul>
            <p style={styles.text}>
              PTOWL does not store passwords. Authentication tokens are managed securely
              through industry-standard protocols.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>4. Cookies & Tracking</h2>
            <p style={styles.text}>
              We keep it simple: PTOWL does not use cookies for tracking purposes. We do not
              use third-party analytics services that track individual users. Session cookies
              are used solely to keep you logged in, and they are httpOnly and secure --
              meaning they cannot be accessed by JavaScript or sent over unencrypted connections.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>5. Data Storage & Security</h2>
            <p style={styles.text}>
              Your data is stored on Cloudflare's global infrastructure, which provides:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>Encryption in transit (TLS 1.3)</li>
              <li style={styles.listItem}>Encryption at rest (AES-256)</li>
              <li style={styles.listItem}>Data distributed across Cloudflare's network of 300+ cities worldwide</li>
              <li style={styles.listItem}>Automatic DDoS protection and threat mitigation</li>
            </ul>
            <p style={styles.text}>
              For more details on our security practices, see our{' '}
              <Link to="/security" style={styles.inlineLink}>Security page</Link>.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>6. HIPAA Considerations</h2>
            <p style={styles.text}>
              PTOWL is designed from the ground up to minimize protected health information (PHI)
              exposure. Our sports alias system means no real patient names are ever stored, and
              we do not collect diagnoses, treatment plans, or insurance details.
            </p>
            <p style={styles.textNote}>
              That said, PTOWL is not yet HIPAA certified. While our architecture is built with
              healthcare privacy in mind, we have not completed formal HIPAA certification. If
              your organization requires a Business Associate Agreement (BAA), please contact us
              to discuss your needs.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>7. Data Sharing</h2>
            <p style={styles.text}>
              We do not sell, rent, or trade your personal information. Period. We may share
              data only in the following limited circumstances:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Service providers:</strong> Cloudflare (hosting/infrastructure) and
                Firebase (authentication) process data on our behalf under strict agreements.
              </li>
              <li style={styles.listItem}>
                <strong>Legal requirements:</strong> We may disclose information if required by
                law, court order, or governmental regulation.
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
              "Last updated" date at the top of this page. We encourage you to review this policy
              periodically. Continued use of PTOWL after changes constitutes acceptance of the
              updated policy.
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
  text: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark-alt)',
    marginBottom: '0.75rem',
  },
  textNote: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--orange-mid)',
    fontWeight: 500,
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
  highlight: {
    background: 'var(--green-light)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem',
    marginBottom: '1rem',
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
