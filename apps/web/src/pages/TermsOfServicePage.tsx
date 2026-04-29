import { Link } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';

export function TermsOfServicePage() {
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
          <h1 style={styles.h1}>Terms of Service</h1>
          <p style={styles.updated}>Last updated: April 29, 2026</p>

          <p style={styles.intro}>
            Welcome to Patient Owl. By using our service, you agree to these terms. They are
            straightforward — we want you to understand exactly what you are signing up for.
            Patient Owl is currently in free beta; we may introduce paid plans in the future and
            will give existing users advance notice before any pricing change.
          </p>

          <section style={styles.section}>
            <h2 style={styles.h2}>1. Acceptance of Terms</h2>
            <p style={styles.text}>
              By accessing or using Patient Owl ("the Service"), you agree to be bound by these
              Terms of Service. If you do not agree to these terms, please do not use the
              Service. We may update these terms from time to time, and continued use after
              changes constitutes acceptance.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>2. Description of Service</h2>
            <p style={styles.text}>
              Patient Owl is a scheduling productivity tool built to make healthcare more
              simple and fun. We help providers create, manage, and print patient schedules
              quickly — with a proprietary de-identification methodology that keeps patient
              identities private by design.
            </p>
            <div style={styles.highlight}>
              <h3 style={styles.h3}>Important Disclaimer</h3>
              <p style={styles.textHighlight}>
                Patient Owl is a scheduling tool, not a medical device. We do not provide
                medical advice, diagnoses, treatment recommendations, or clinical decision
                support. Any scheduling decisions remain the sole responsibility of the
                healthcare provider.
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>3. Account Registration</h2>
            <p style={styles.text}>
              To use Patient Owl, you must create an account by signing in via Google, Apple,
              email magic link, or SMS (handled through Firebase Authentication). You are
              responsible for maintaining the security of your account credentials and for all
              activity that occurs under your account. If you suspect unauthorized access, notify
              us immediately at{' '}
              <a href="mailto:help@ptowl.com" style={styles.inlineLink}>help@ptowl.com</a>.
            </p>
            <p style={styles.text}>
              You may request deletion of your account and associated data at any time by emailing
              the same address. We&apos;ll process the request within 30 days.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>4. Pricing & Access</h2>
            <p style={styles.text}>
              Patient Owl is currently free to use. We reserve the right to introduce paid tiers or
              modify pricing in the future. If we do, existing free users will receive advance
              notice and will not be charged without explicit consent.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>5. Privacy by Design & Compliance</h2>
            <p style={styles.text}>
              Patient Owl is architected so that protected health information (PHI) is never
              stored in our system. Our proprietary de-identification methodology replaces
              patient identities with sports figure aliases at the point of entry — real patient
              names are never entered, transmitted, or stored. We do not collect diagnoses,
              treatment plans, insurance details, or clinical records.
            </p>
            <p style={styles.text}>
              Because PHI is architecturally excluded from our data layer, the traditional
              HIPAA data protection requirements that apply to systems holding PHI are largely
              not applicable to Patient Owl's stored data.
            </p>
            <div style={styles.warningBox}>
              <p style={styles.warningText}>
                Healthcare providers remain solely responsible for their own regulatory
                compliance. It is your responsibility to ensure your use of the Service
                complies with all applicable healthcare regulations. If you have compliance
                questions, contact us at help@ptowl.com.
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>6. Acceptable Use</h2>
            <p style={styles.text}>
              You agree to use Patient Owl only for its intended purpose: generating and managing
              physical therapy schedules. You may not:
            </p>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                Attempt to gain unauthorized access to other accounts or our systems
              </li>
              <li style={styles.listItem}>
                Use the Service to store, transmit, or distribute malicious software
              </li>
              <li style={styles.listItem}>
                Reverse-engineer, decompile, or disassemble any part of the Service
              </li>
              <li style={styles.listItem}>
                Use automated scripts or bots to access the Service in a way that degrades
                performance for others
              </li>
              <li style={styles.listItem}>
                Misrepresent your identity or affiliation with any person or organization
              </li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>7. Account Termination</h2>
            <p style={styles.text}>
              We reserve the right to suspend or terminate your account if you violate these
              Terms of Service, engage in abusive behavior, or use the Service in a way that
              threatens the security or performance of our platform. We will make reasonable
              efforts to notify you before termination, except in cases of severe violations
              where immediate action is necessary.
            </p>
            <p style={styles.text}>
              You may also delete your own account at any time by contacting us at{' '}
              <a href="mailto:help@ptowl.com" style={styles.inlineLink}>help@ptowl.com</a>.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>8. Intellectual Property</h2>
            <p style={styles.text}>
              The Patient Owl service, including its design, code, logo, owl mascot, and all
              associated trademarks, are the intellectual property of Moose Bay &amp; Company LLC. You may not
              copy, modify, distribute, or create derivative works based on our Service without
              prior written consent.
            </p>
            <p style={styles.text}>
              You retain ownership of all schedule data and clinic information you enter into
              Patient Owl. We do not claim any rights over your content.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>9. Disclaimer of Warranties</h2>
            <div style={styles.legalBox}>
              <p style={styles.legalText}>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY
                KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES
                OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                Patient Owl DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR
                COMPLETELY SECURE.
              </p>
            </div>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>10. Healthcare Provider Responsibilities</h2>
            <p style={styles.text}>
              If you are a healthcare provider using Patient Owl, you acknowledge and agree that:
            </p>
            <ul style={styles.list}>
              <li>You will <strong>not enter Protected Health Information (PHI)</strong> into any text field,
                  including but not limited to patient names, medical record numbers, Social Security numbers,
                  or clinical notes containing diagnoses or treatment details.</li>
              <li>You are solely responsible for your own compliance with HIPAA, state privacy laws,
                  and applicable professional licensing requirements.</li>
              <li>Patient Owl is a scheduling tool and does not constitute a Business Associate as defined
                  under HIPAA. No Business Associate Agreement (BAA) is required or offered.</li>
              <li>The de-identification methodology used by Patient Owl (two-letter initials mapped to
                  sports figure aliases) is your responsibility to evaluate for suitability in your practice.</li>
              <li>Any notes entered into schedule text fields are <strong>unencrypted</strong> and should not
                  contain personally identifiable information.</li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>11. Indemnification</h2>
            <p style={styles.text}>
              You agree to indemnify, defend, and hold harmless Moose Bay &amp; Company LLC, its officers,
              directors, employees, and agents from and against any claims, damages, losses, liabilities,
              costs, or expenses (including reasonable attorneys' fees) arising from:
            </p>
            <ul style={styles.list}>
              <li>Your use of the Service in violation of these Terms;</li>
              <li>Your entry of Protected Health Information or other regulated data into the Service;</li>
              <li>Your violation of any applicable law, regulation, or third-party rights;</li>
              <li>Any claim by a patient or third party arising from your use of the Service.</li>
            </ul>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>12. Limitation of Liability</h2>
            <p style={styles.text}>
              To the maximum extent permitted by law, Moose Bay &amp; Company LLC and its officers, directors,
              employees, and agents shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages arising from your use of or inability to use the
              Service, including but not limited to loss of data, scheduling errors, or business
              interruption.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>13. Governing Law</h2>
            <p style={styles.text}>
              These Terms of Service are governed by and construed in accordance with the laws
              of the Commonwealth of Virginia, United States of America, without regard to its
              conflict of law provisions. Any disputes arising under these terms shall be resolved
              in the courts located in Virginia.
            </p>
          </section>

          <section style={styles.section}>
            <h2 style={styles.h2}>14. Contact</h2>
            <p style={styles.text}>
              Questions or concerns about these terms? Reach out -- we do not bite (the owl might,
              but we will keep it under control).
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
  textHighlight: {
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
  },
  warningBox: {
    background: 'var(--orange-light)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem',
    marginTop: '0.75rem',
    borderLeft: '3px solid var(--orange-mid)',
  },
  warningText: {
    fontSize: '0.9375rem',
    lineHeight: 1.7,
    color: 'var(--dark)',
    fontWeight: 500,
    marginBottom: 0,
  },
  legalBox: {
    background: 'var(--gray-light)',
    borderRadius: 'var(--radius)',
    padding: '1.25rem',
    borderLeft: '3px solid var(--gray-mid)',
  },
  legalText: {
    fontSize: '0.8125rem',
    lineHeight: 1.6,
    color: 'var(--dark-alt)',
    fontFamily: 'var(--font-mono)',
    marginBottom: 0,
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
