import { Link } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export function PrivacyPolicyPage() {
  usePageTitle('Privacy Policy');
  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.container}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
          }}
        >
          <OwlLogo size="sm" linkTo="/" />
          <Link to="/dashboard" style={styles.backLink}>
            &larr; Back to Dashboard
          </Link>
        </div>

        <div style={styles.card}>
          <h1 style={styles.h1}>Privacy Policy</h1>
          <p style={styles.updated}>Last updated: May 5, 2026</p>

          <p style={styles.intro}>
            We keep it simple, Jack. PTowl was designed from day one so that real patient names
            never touch our servers. This policy explains exactly what we collect, what we
            don&apos;t, and why our approach to privacy is different.
          </p>

          <section style={styles.section}>
            <h2 style={styles.h2}>Our Privacy Philosophy: Privacy by Design</h2>
            <div style={styles.highlight}>
              <p style={styles.highlightText}>
                Most healthcare tools collect sensitive data and then try to protect it. We took the
                opposite approach:{' '}
                <strong>real patient names never enter PTowl in the first place.</strong> Providers
                enter two-letter initials, which we immediately map to a sports figure alias for
                display, printing, and audit logs. You cannot breach what does not exist.
              </p>
              <p style={styles.highlightText}>
                <strong>PTowl is not a HIPAA-compliant system.</strong> The sports-alias model is
                our privacy failsafe, not a substitute for HIPAA. Don&apos;t use PTowl as the system
                of record for protected health information.
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
                <strong>Provider authentication:</strong> Sign-in via Google or email and password
                (handled by Clerk). We receive a Clerk user ID plus whichever identifier you signed
                in with (your email address and/or your linked Google account).
              </li>
              <li style={styles.listItem}>
                <strong>Clinic details:</strong> Clinic name, address, phone, email, and an optional
                logo URL you add to your profile for printed schedule headers.
              </li>
              <li style={styles.listItem}>
                <strong>Patient initials (mapped to sports aliases):</strong> Two-letter initials
                are stored alongside their generated alias from our 676-name sports-figure dataset.
                Real first or last names are never collected, transmitted, or stored.
              </li>
              <li style={styles.listItem}>
                <strong>Schedule data:</strong> Appointment dates, times, sessions-per-week, and
                duration. Linked to the alias only.
              </li>
              <li style={styles.listItem}>
                <strong>Patient reminder email (optional, encrypted):</strong> If your provider
                enables appointment reminders, the patient email address you provide is stored
                encrypted at rest using AES-256-GCM and used solely to deliver 24-hour and 1-hour
                reminders. The plaintext email is never logged, never displayed in-app, and never
                shared with any third party other than the outbound email subprocessor
                (MailChannels) at the moment of send. See section 8 for full details.
              </li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>1a. Account Deletion</h2>
            <p style={styles.text}>
              You can request deletion of your account and all associated data at any time by
              emailing{' '}
              <a
                href="mailto:help@ptowl.com?subject=Delete%20my%20PTowl%20account"
                style={styles.inlineLink}
              >
                help@ptowl.com
              </a>
              . We will process the request within 30 days and confirm by reply when complete. A
              self-serve deletion control is on our roadmap; until it ships, the email path is the
              canonical way to exercise this right.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>2. What We Do NOT Collect</h2>
            <div style={styles.highlight}>
              <h3 style={styles.h3}>Proprietary De-Identification Methodology</h3>
              <p style={styles.highlightText}>
                PTowl uses a proprietary de-identification methodology that replaces patient
                identities with sports figure aliases at the point of entry. When a provider types
                two initials, the system immediately maps them to an alias (e.g., "MJ" becomes
                "Michael Jordan"). The real patient name is never entered, transmitted, or stored
                anywhere in our system. This methodology ensures that even in the unlikely event of
                a data breach, no real patient identities would be exposed — because they were never
                there.
              </p>
            </div>
            <p style={styles.text}>We also do not collect:</p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Real patient names — only two-letter initials, immediately de-identified
              </li>
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
                PTowl's architecture was built around a simple principle: the most secure data is
                data you never collect. Because our proprietary de-identification methodology
                ensures that real patient names and protected health information are never stored in
                our system, the traditional HIPAA data protection requirements that apply to systems
                holding PHI are largely not applicable to PTowl's data layer.
              </p>
              <p style={styles.text}>
                This is not a workaround — it is a deliberate design decision. We believe healthcare
                tools should be simple, fast, and private by default. You should not need a 200-page
                compliance manual to print a schedule.
              </p>
              <p style={{ ...styles.text, marginBottom: 0 }}>
                That said, healthcare providers are responsible for their own compliance with
                applicable regulations. If you have specific compliance questions about your use of
                PTowl, we are happy to discuss your needs at{' '}
                <a href="mailto:help@ptowl.com" style={styles.inlineLink}>
                  help@ptowl.com
                </a>
                .
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>4. Authentication</h2>
            <p style={styles.text}>
              PTowl uses managed authentication provided by Clerk. You sign in with Google or with
              your email and password. Password hashing, credential storage, account recovery, and
              session management are all handled by Clerk under their security posture; PTowl itself
              never sees or stores your password. On every API request, the Clerk-issued session JWT
              is verified against Clerk&apos;s public JWKS endpoint.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>5. Cookies & Tracking</h2>
            <p style={styles.text}>
              We keep it simple: PTowl does not use tracking cookies. We do not use third-party
              analytics that track individual users. Session cookies are used solely to keep you
              logged in, and they are httpOnly and secure — meaning they cannot be accessed by
              JavaScript or sent over unencrypted connections.
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
              <Link to="/security" style={styles.inlineLink}>
                Security page
              </Link>
              .
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>7. Subprocessors &amp; Data Sharing</h2>
            <p style={styles.text}>
              We do not sell, rent, or trade your personal information. Period. We share data only
              with the infrastructure subprocessors necessary to operate the service. Each
              subprocessor is contractually bound to confidentiality and processes data only on our
              instructions.
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>Cloudflare, Inc.</strong> — application hosting (Workers, Pages), database
                (D1), object storage (R2), DNS, CDN, WAF, bot protection (Turnstile), email routing,
                and edge analytics. <em>Located in the United States.</em>
              </li>
              <li style={styles.listItem}>
                <strong>Clerk, Inc.</strong> — provider authentication and session management
                (Google sign-in and email/password). <em>Located in the United States.</em>
              </li>
              <li style={styles.listItem}>
                <strong>MailChannels Corp.</strong> — outbound transactional email delivery (account
                notifications, appointment reminders, share-link emails). Patient emails are
                decrypted only at the moment of send and are not retained by MailChannels beyond the
                delivery window. <em>Located in Canada.</em>
              </li>
              <li style={styles.listItem}>
                <strong>Tawk.to Inc.</strong> — in-app live chat support widget. The widget is
                loaded only when you open the chat. Chat content you submit is processed by Tawk.to
                under their privacy policy. <em>Located in Las Vegas, USA.</em>
              </li>
              <li style={styles.listItem}>
                <strong>Legal requirements</strong> — we may disclose information if required by
                law, court order, or governmental regulation.
              </li>
            </ul>
            <p style={styles.text}>
              The current list of subprocessors is maintained on this page. Material changes will be
              reflected via the "Last updated" date at the top of this policy.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>8. Patient Appointment Reminders</h2>
            <p style={styles.text}>
              PTowl provides an optional, opt-in appointment reminder feature. When a
              physical-therapy provider enables reminders for a schedule, we send transactional
              emails 24 hours and 1 hour before each scheduled appointment.
            </p>
            <h3 style={styles.h3}>What is collected</h3>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                The patient email address supplied by the provider. The address is encrypted at rest
                using AES-256-GCM with a key held only by the Worker runtime; the plaintext value is
                never written to logs or displayed to anyone, including support staff.
              </li>
              <li style={styles.listItem}>
                A one-way SHA-256 hash of the email, used as a stable opaque identifier so we can
                honor unsubscribe requests across schedules without retaining the plaintext email
                after a global unsubscribe.
              </li>
              <li style={styles.listItem}>
                Per-appointment "reminder sent" timestamps, stored only to prevent duplicate sends;
                these contain no personal data.
              </li>
            </ul>
            <h3 style={styles.h3}>How it is used</h3>
            <p style={styles.text}>
              Solely to deliver appointment-reminder emails and to honor patient subscription
              preferences. We do not use the email for marketing, analytics, profiling, advertising,
              or any secondary purpose. We do not share the email with third parties except the
              outbound email subprocessor (MailChannels) at the moment of send.
            </p>
            <h3 style={styles.h3}>How long it is retained</h3>
            <p style={styles.text}>
              The encrypted email is retained until the provider deletes the schedule or the patient
              globally unsubscribes. Upon a schedule deletion, the encrypted email is removed from
              our database. Upon a global unsubscribe, the plaintext email is never reused; only the
              SHA-256 hash is retained on a suppression list, indefinitely, so future reminders to
              the same address are blocked even if a different provider re-enters it.
            </p>
            <h3 style={styles.h3}>Patient rights</h3>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                <strong>One-click unsubscribe.</strong> Every reminder email contains a footer link
                to a self-service preferences page. Patients can resume individual reminders, switch
                to a daily digest, or globally unsubscribe — without creating an account or entering
                any password.
              </li>
              <li style={styles.listItem}>
                <strong>Access, correction, deletion.</strong> Patients may also contact{' '}
                <a href="mailto:help@ptowl.com" style={styles.inlineLink}>
                  help@ptowl.com
                </a>{' '}
                to request access, correction, or deletion of any reminder data we hold tied to
                their email. We respond within 30 days, and within 24 hours for unsubscribe
                requests.
              </li>
              <li style={styles.listItem}>
                <strong>Provider-initiated removal.</strong> Patients may also ask their PT clinic
                to remove their email from a schedule, which immediately stops future reminders for
                that schedule.
              </li>
            </ul>
            <p style={styles.text}>
              The reminder feature is not necessary for the core scheduling product. Providers who
              do not enter a patient email simply do not generate reminder emails — no processing of
              patient personal data occurs.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>9. Your Rights & Data Deletion</h2>
            <p style={styles.text}>
              You have the right to access, correct, or delete your data at any time. To request
              data export or account deletion, email us at{' '}
              <a href="mailto:help@ptowl.com" style={styles.inlineLink}>
                help@ptowl.com
              </a>
              . We will process deletion requests within 30 days.
            </p>
            <p style={styles.text}>
              When your account is deleted, all associated schedule data, clinic information, and
              profile details are permanently removed from our systems.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>10. Medical Information Disclaimer</h2>
            <p style={styles.text}>
              PTowl is a <strong>scheduling and organizational tool</strong>. It is not a medical
              device, electronic health record (EHR), clinical decision support system, or
              HIPAA-covered entity. We do not provide medical advice, diagnoses, or treatment
              recommendations.
            </p>
            <p style={styles.text}>
              Our platform is architecturally designed so that Protected Health Information (PHI) is
              never stored, processed, or transmitted through our systems. Patient names are
              replaced with two-letter initials mapped to sports figure aliases through our
              proprietary de-identification methodology. Schedule dates and appointment times, when
              separated from patient identifiers, do not constitute PHI under HIPAA's Safe Harbor
              de-identification standard (45 CFR §164.514(b)(2)).
            </p>
            <p style={styles.text}>
              Healthcare providers using PTowl remain solely responsible for their own regulatory
              compliance, including but not limited to HIPAA, state privacy laws, and professional
              licensing requirements. PTowl makes no guarantees, representations, or warranties
              regarding regulatory compliance.
            </p>
            <p style={styles.text}>
              If you believe that Protected Health Information has been inadvertently entered into
              any PTowl text field, please contact us immediately at{' '}
              <a href="mailto:help@ptowl.com" style={styles.inlineLink}>
                help@ptowl.com
              </a>{' '}
              for prompt removal. We will process PHI removal requests within 24 hours.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>11. Changes to This Policy</h2>
            <p style={styles.text}>
              We may update this privacy policy from time to time. When we do, we will update the
              "Last updated" date at the top of this page. Continued use of PTowl after changes
              constitutes acceptance of the updated policy.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>12. Contact Us</h2>
            <p style={styles.text}>Questions about this privacy policy? We are happy to help.</p>
            <p style={styles.contactBlock}>
              Email:{' '}
              <a href="mailto:help@ptowl.com" style={styles.inlineLink}>
                help@ptowl.com
              </a>
              <br />
              PTowl is a product of Moose Bay &amp; Company LLC &middot; Virginia, USA
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
