import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { apiRequest } from '../api/client.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { PageLayout } from '../components/layout/PageLayout.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { getMFAStatus, startMFAEnrollment, finalizeMFAEnrollment, unenrollMFA } from '../firebase.js';

export function ProfilePage() {
  usePageTitle('Profile');
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // MFA state
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [mfaPhone, setMfaPhone] = useState('');
  const [mfaPhoneHint, setMfaPhoneHint] = useState('');
  const [mfaStep, setMfaStep] = useState<'idle' | 'phone' | 'code'>('idle');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerificationId, setMfaVerificationId] = useState('');
  const [mfaMessage, setMfaMessage] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setClinicName(user.clinic_name || '');
      setClinicAddress(user.clinic_address || '');
      setClinicPhone(user.clinic_phone || '');
      setClinicEmail(user.clinic_email || '');

      // Check MFA status
      const status = getMFAStatus();
      setMfaEnrolled(status.enrolled);
      setMfaPhoneHint(status.phoneHint || '');
    }
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setIsError(false);

    const result = await apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify({
        clinic_name: clinicName,
        clinic_address: clinicAddress,
        clinic_phone: clinicPhone,
        clinic_email: clinicEmail,
      }),
    });

    if (result.ok) {
      setMessage('Saved!');
      setIsError(false);
      await refreshUser();
    } else {
      setMessage(result.error?.message || 'Save failed');
      setIsError(true);
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <PageLayout>
    <div style={styles.page}>
      <header style={styles.header}>
        <OwlLogo size="md" linkTo="/dashboard" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <main id="main-content" style={styles.main}>
        <h1 style={styles.title}>Profile & Clinic Info</h1>
        <p style={styles.subtitle}>This information appears on your printed schedules.</p>

        <form onSubmit={handleSave} style={styles.form}>
          <div
            style={message ? (isError ? styles.messageError : styles.messageSuccess) : { height: 0, overflow: 'hidden' }}
            aria-live={isError ? 'assertive' : 'polite'}
            role={isError ? 'alert' : 'status'}
          >
            {isError && message ? `Error: ${message}` : message}
          </div>

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email</span>
            <span style={styles.infoValue}>{user.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Tier</span>
            <span style={styles.infoValue}>{user.tier === 'paid' ? 'Paid' : 'Free'}</span>
          </div>

          <hr style={styles.divider} />

          <label htmlFor="clinic-name" style={styles.label}>
            Clinic Name
            <input id="clinic-name" type="text" value={clinicName} onChange={(e) => setClinicName(e.target.value)} style={styles.input} maxLength={200} />
          </label>
          <label htmlFor="clinic-address" style={styles.label}>
            Clinic Address
            <textarea id="clinic-address" value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} style={styles.textarea} maxLength={500} rows={2} />
          </label>
          <label htmlFor="clinic-phone" style={styles.label}>
            Clinic Phone
            <input id="clinic-phone" type="tel" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} style={styles.input} maxLength={20} />
          </label>
          <label htmlFor="clinic-email" style={styles.label}>
            Clinic Email
            <input id="clinic-email" type="email" value={clinicEmail} onChange={(e) => setClinicEmail(e.target.value)} style={styles.input} maxLength={254} />
          </label>

          <button type="submit" style={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* MFA Section */}
        <div style={styles.mfaSection}>
          <h3 style={styles.mfaSectionTitle}>Two-Factor Authentication</h3>
          <p style={styles.mfaDesc}>
            {mfaEnrolled
              ? `SMS MFA is enabled. Second factor: ${mfaPhoneHint}`
              : 'Add a second phone number for extra security. You\'ll need to verify it each time you sign in.'}
          </p>

          {mfaMessage && (
            <div style={mfaMessage.includes('Error') || mfaMessage.includes('Failed') ? styles.messageError : styles.messageSuccess}>
              {mfaMessage}
            </div>
          )}

          {mfaEnrolled ? (
            <button
              style={styles.mfaDisableBtn}
              disabled={mfaLoading}
              onClick={async () => {
                setMfaLoading(true);
                setMfaMessage('');
                try {
                  await unenrollMFA();
                  setMfaEnrolled(false);
                  setMfaPhoneHint('');
                  setMfaMessage('MFA disabled');
                } catch {
                  setMfaMessage('Error: Failed to disable MFA');
                }
                setMfaLoading(false);
              }}
            >
              {mfaLoading ? 'Disabling...' : 'Disable MFA'}
            </button>
          ) : mfaStep === 'idle' ? (
            <button
              style={styles.mfaEnableBtn}
              onClick={() => setMfaStep('phone')}
            >
              Enable SMS MFA
            </button>
          ) : mfaStep === 'phone' ? (
            <div style={styles.mfaForm}>
              <p style={styles.mfaFormLabel}>Enter a second phone number (different from your login number)</p>
              <div style={styles.mfaPhoneRow}>
                <span style={styles.mfaCountryCode}>+1</span>
                <input
                  type="tel"
                  value={mfaPhone}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setMfaPhone(digits);
                    setMfaMessage('');
                  }}
                  placeholder="(555) 123-4567"
                  style={styles.mfaInput}
                  autoFocus
                />
              </div>
              <button
                style={{ ...styles.mfaEnableBtn, opacity: mfaLoading ? 0.6 : 1 }}
                disabled={mfaLoading}
                onClick={async () => {
                  if (mfaPhone.length !== 10) {
                    setMfaMessage('Error: Enter a 10-digit phone number');
                    return;
                  }
                  setMfaLoading(true);
                  setMfaMessage('');
                  try {
                    const vid = await startMFAEnrollment(`+1${mfaPhone}`, 'mfa-recaptcha-container');
                    setMfaVerificationId(vid);
                    setMfaStep('code');
                  } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : '';
                    if (msg.includes('requires-recent-login')) {
                      setMfaMessage('Error: Please log out and back in, then try again');
                    } else {
                      setMfaMessage('Error: Failed to send code. Try again.');
                    }
                  }
                  setMfaLoading(false);
                }}
              >
                {mfaLoading ? 'Sending...' : 'Send Verification Code'}
              </button>
              <button style={styles.mfaCancelBtn} onClick={() => { setMfaStep('idle'); setMfaPhone(''); setMfaMessage(''); }}>
                Cancel
              </button>
              <div id="mfa-recaptcha-container" />
            </div>
          ) : (
            <div style={styles.mfaForm}>
              <p style={styles.mfaFormLabel}>Enter the 6-digit code sent to your MFA phone</p>
              <input
                type="text"
                inputMode="numeric"
                value={mfaCode}
                onChange={(e) => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setMfaMessage(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && mfaCode.length === 6) {
                    (async () => {
                      setMfaLoading(true);
                      try {
                        await finalizeMFAEnrollment(mfaVerificationId, mfaCode);
                        setMfaEnrolled(true);
                        const status = getMFAStatus();
                        setMfaPhoneHint(status.phoneHint || '');
                        setMfaStep('idle');
                        setMfaCode('');
                        setMfaPhone('');
                        setMfaMessage('MFA enabled successfully!');
                      } catch {
                        setMfaMessage('Error: Invalid code. Try again.');
                      }
                      setMfaLoading(false);
                    })();
                  }
                }}
                placeholder="000000"
                style={styles.mfaCodeInput}
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
              />
              <button
                style={{ ...styles.mfaEnableBtn, opacity: mfaLoading ? 0.6 : 1 }}
                disabled={mfaLoading}
                onClick={async () => {
                  if (mfaCode.length < 6) {
                    setMfaMessage('Error: Enter the 6-digit code');
                    return;
                  }
                  setMfaLoading(true);
                  setMfaMessage('');
                  try {
                    await finalizeMFAEnrollment(mfaVerificationId, mfaCode);
                    setMfaEnrolled(true);
                    const status = getMFAStatus();
                    setMfaPhoneHint(status.phoneHint || '');
                    setMfaStep('idle');
                    setMfaCode('');
                    setMfaPhone('');
                    setMfaMessage('MFA enabled successfully!');
                  } catch {
                    setMfaMessage('Error: Invalid code. Try again.');
                  }
                  setMfaLoading(false);
                }}
              >
                {mfaLoading ? 'Verifying...' : 'Verify & Enable MFA'}
              </button>
              <button style={styles.mfaCancelBtn} onClick={() => { setMfaStep('phone'); setMfaCode(''); setMfaMessage(''); }}>
                Back
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
    </PageLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--white)', borderBottom: '1px solid var(--gray-mid)' },
  backBtn: { padding: '0.625rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontSize: '0.875rem' },
  logoutBtn: { padding: '0.5rem 1rem', background: 'var(--red-light)', color: 'var(--red-mid)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500 },
  main: { maxWidth: '600px', margin: '0 auto', padding: '2rem 1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' },
  subtitle: { color: 'var(--gray-text)', marginBottom: '1.5rem' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  messageSuccess: { padding: '0.75rem', background: 'var(--green-light)', color: 'var(--green-dark)', borderRadius: 'var(--radius)', fontSize: '0.875rem' },
  messageError: { padding: '0.75rem', background: 'var(--red-light)', color: 'var(--red-dark)', borderRadius: 'var(--radius)', fontSize: '0.875rem' },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' },
  infoLabel: { fontWeight: 500, fontSize: '0.875rem' },
  infoValue: { color: 'var(--gray-text)', fontSize: '0.875rem' },
  divider: { border: 'none', borderTop: '1px solid var(--gray-mid)', margin: '0.5rem 0' },
  label: { display: 'flex', flexDirection: 'column' as const, gap: '0.375rem', fontSize: '0.875rem', fontWeight: 500 },
  input: { padding: '0.75rem', border: '1px solid var(--gray-mid)', borderRadius: 'var(--radius)', fontSize: '1rem' },
  textarea: { padding: '0.75rem', border: '1px solid var(--gray-mid)', borderRadius: 'var(--radius)', fontSize: '1rem', resize: 'vertical' as const },
  saveBtn: { padding: '0.75rem', background: 'var(--green-mid)', color: 'white', borderRadius: 'var(--radius)', fontSize: '1rem', fontWeight: 600, marginTop: '0.5rem' },
  mfaSection: { marginTop: '2rem', padding: '1.5rem', background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--gray-mid)' },
  mfaSectionTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' },
  mfaDesc: { color: 'var(--gray-text)', fontSize: '0.875rem', marginBottom: '1rem', lineHeight: 1.5 },
  mfaEnableBtn: { padding: '0.625rem 1.25rem', background: 'var(--green-mid)', color: 'white', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer' },
  mfaDisableBtn: { padding: '0.625rem 1.25rem', background: 'var(--red-light)', color: 'var(--red-mid)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer' },
  mfaCancelBtn: { padding: '0.5rem', background: 'none', border: 'none', color: 'var(--gray-text)', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.5rem' },
  mfaForm: { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
  mfaFormLabel: { fontSize: '0.85rem', color: 'var(--gray-text)' },
  mfaPhoneRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  mfaCountryCode: { padding: '0.625rem 0.5rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.875rem' },
  mfaInput: { flex: 1, padding: '0.625rem', fontSize: '1rem', fontFamily: 'var(--font-mono)', border: '1px solid var(--gray-mid)', borderRadius: 'var(--radius)', outline: 'none' },
  mfaCodeInput: { padding: '0.75rem', fontSize: '1.5rem', textAlign: 'center' as const, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.5rem', border: '2px solid var(--green-mid)', borderRadius: 'var(--radius)', outline: 'none', boxSizing: 'border-box' as const },
};
