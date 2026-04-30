import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext.js';
import { apiRequest } from '../api/client.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { PageLayout } from '../components/layout/PageLayout.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export function ProfilePage() {
  usePageTitle('Profile');
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setClinicName(user.clinic_name || '');
      setClinicAddress(user.clinic_address || '');
      setClinicPhone(user.clinic_phone || '');
      setClinicEmail(user.clinic_email || '');
      setLogoUrl(user.logo_url || '');
    }
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const result = await apiRequest('/profile', {
      method: 'PUT',
      body: JSON.stringify({
        clinic_name: clinicName,
        clinic_address: clinicAddress,
        clinic_phone: clinicPhone,
        clinic_email: clinicEmail,
        logo_url: logoUrl || null,
      }),
    });

    if (result.ok) {
      toast.success('Profile saved!');
      await refreshUser();
      window.dispatchEvent(new CustomEvent('ptowl-onboarding', { detail: 'profile' }));
    } else {
      toast.error(result.error?.message || 'Save failed');
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <PageLayout>
      <div style={styles.page}>
        <header style={styles.header} className="ptowl-header">
          <OwlLogo size="md" linkTo="/" />
          <div style={{ display: 'flex', gap: '0.5rem' }} className="ptowl-header-actions">
            <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
              Dashboard
            </button>
          </div>
        </header>

        <main id="main-content" style={styles.main} className="ptowl-main">
          <h1 style={styles.title}>Profile & Clinic Info</h1>
          <p style={styles.subtitle}>This information appears on your printed schedules.</p>

          {/* Profile completeness */}
          {(() => {
            const fields = [
              { label: 'Clinic name', done: !!clinicName },
              { label: 'Address', done: !!clinicAddress },
              { label: 'Phone', done: !!clinicPhone },
              { label: 'Email', done: !!clinicEmail },
            ];
            const done = fields.filter((f) => f.done).length;
            const pct = Math.round((done / fields.length) * 100);
            return (
              <div
                style={{
                  background: 'var(--green-bg)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem',
                  marginBottom: '1.5rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <span
                    style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--green-dark)' }}
                  >
                    Profile {pct}% complete
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-text)' }}>
                    {done}/{fields.length}
                  </span>
                </div>
                <div
                  style={{
                    height: '6px',
                    background: 'var(--gray-mid)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: 'var(--green-mid)',
                      borderRadius: '999px',
                      transition: 'width 0.3s',
                    }}
                  />
                </div>
                {pct < 100 && (
                  <p
                    style={{ fontSize: '0.75rem', color: 'var(--gray-text)', marginTop: '0.5rem' }}
                  >
                    Missing:{' '}
                    {fields
                      .filter((f) => !f.done)
                      .map((f) => f.label)
                      .join(', ')}
                  </p>
                )}
              </div>
            );
          })()}

          <form onSubmit={handleSave} style={styles.form}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Email</span>
              <span style={styles.infoValue}>{user.email}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Plan</span>
              <span style={styles.infoValue}>Beta access</span>
            </div>

            <hr style={styles.divider} />

            <label htmlFor="clinic-name" style={styles.label}>
              Clinic Name
              <input
                id="clinic-name"
                type="text"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                style={styles.input}
                maxLength={200}
                aria-required="true"
              />
            </label>
            <label htmlFor="clinic-address" style={styles.label}>
              Clinic Address
              <textarea
                id="clinic-address"
                value={clinicAddress}
                onChange={(e) => setClinicAddress(e.target.value)}
                style={styles.textarea}
                maxLength={500}
                rows={2}
              />
            </label>
            <label htmlFor="clinic-phone" style={styles.label}>
              Clinic Phone
              <input
                id="clinic-phone"
                type="tel"
                value={clinicPhone}
                onChange={(e) => setClinicPhone(e.target.value)}
                style={styles.input}
                maxLength={20}
              />
            </label>
            <label htmlFor="clinic-email" style={styles.label}>
              Clinic Email
              <input
                id="clinic-email"
                type="email"
                value={clinicEmail}
                onChange={(e) => setClinicEmail(e.target.value)}
                style={styles.input}
                maxLength={254}
              />
            </label>
            <label htmlFor="logo-url" style={styles.label}>
              Logo URL{' '}
              <span style={styles.labelHint}>(optional — appears on printed schedule headers)</span>
              <input
                id="logo-url"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                style={styles.input}
                maxLength={500}
                placeholder="https://your-logo-host.com/logo.png"
                inputMode="url"
              />
              {logoUrl && (
                <span style={styles.logoPreviewWrap}>
                  <img src={logoUrl} alt="Logo preview" style={styles.logoPreviewImg} />
                </span>
              )}
            </label>

            <button type="submit" style={styles.saveBtn} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>

          {/* Account section — sign out + data deletion */}
          <div style={styles.accountSection}>
            <h3 style={styles.accountSectionTitle}>Account</h3>
            <p style={styles.accountDesc}>
              Need to delete your account and all associated data? Email{' '}
              <a
                href="mailto:help@ptowl.com?subject=Delete%20my%20PTowl%20account&body=Please%20delete%20my%20account%20and%20all%20associated%20data."
                style={styles.accountLink}
              >
                help@ptowl.com
              </a>
              . We&apos;ll process the request within 30 days.
            </p>
            <button type="button" style={styles.signOutBtn} onClick={logout}>
              Sign out
            </button>
          </div>
        </main>
      </div>
    </PageLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: 'var(--white)',
    borderBottom: '1px solid var(--gray-mid)',
  },
  backBtn: {
    padding: '0.625rem 1rem',
    background: 'var(--gray-light)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    background: 'var(--red-light)',
    color: 'var(--red-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  main: { maxWidth: 'clamp(320px, 92vw, 800px)', margin: '0 auto', padding: '2rem 1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' },
  subtitle: { color: 'var(--gray-text)', marginBottom: '1.5rem' },
  form: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  messageSuccess: {
    padding: '0.75rem',
    background: 'var(--green-light)',
    color: 'var(--green-dark)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
  },
  messageError: {
    padding: '0.75rem',
    background: 'var(--red-light)',
    color: 'var(--red-dark)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
  },
  infoRow: { display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' },
  infoLabel: { fontWeight: 500, fontSize: '0.875rem' },
  infoValue: { color: 'var(--gray-text)', fontSize: '0.875rem' },
  divider: { border: 'none', borderTop: '1px solid var(--gray-mid)', margin: '0.5rem 0' },
  label: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  input: {
    padding: '0.75rem',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    resize: 'vertical' as const,
  },
  saveBtn: {
    padding: '0.75rem',
    background: 'var(--green-mid)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontSize: '1rem',
    fontWeight: 600,
    marginTop: '0.5rem',
  },
  labelHint: {
    fontWeight: 400,
    color: 'var(--gray-text)',
    fontSize: '0.75rem',
    marginLeft: '0.25rem',
  },
  logoPreviewWrap: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '0.5rem',
    background: 'var(--off-white)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    marginTop: '0.25rem',
  },
  logoPreviewImg: { maxHeight: '48px', maxWidth: '160px', objectFit: 'contain' as const },
  accountSection: {
    marginTop: '2rem',
    padding: '1.5rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--gray-mid)',
  },
  accountSectionTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' },
  accountDesc: {
    color: 'var(--gray-text)',
    fontSize: '0.875rem',
    lineHeight: 1.5,
    marginBottom: '1rem',
  },
  accountLink: { color: 'var(--green-dark)', fontWeight: 600 },
  signOutBtn: {
    padding: '0.625rem 1.25rem',
    background: 'var(--red-light)',
    color: 'var(--red-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: '1px solid var(--red-mid)',
    cursor: 'pointer',
  },
  mfaSection: {
    marginTop: '2rem',
    padding: '1.5rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--gray-mid)',
  },
  mfaSectionTitle: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' },
  mfaDesc: {
    color: 'var(--gray-text)',
    fontSize: '0.875rem',
    marginBottom: '1rem',
    lineHeight: 1.5,
  },
  mfaEnableBtn: {
    padding: '0.625rem 1.25rem',
    background: 'var(--green-mid)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  mfaDisableBtn: {
    padding: '0.625rem 1.25rem',
    background: 'var(--red-light)',
    color: 'var(--red-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
  },
  mfaCancelBtn: {
    padding: '0.5rem',
    background: 'none',
    border: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  mfaForm: { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
  mfaFormLabel: { fontSize: '0.85rem', color: 'var(--gray-text)' },
  mfaPhoneRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  mfaCountryCode: {
    padding: '0.625rem 0.5rem',
    background: 'var(--gray-light)',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-mono)',
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  mfaInput: {
    flex: 1,
    padding: '0.625rem',
    fontSize: '1rem',
    fontFamily: 'var(--font-mono)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    outline: 'none',
  },
  mfaCodeInput: {
    padding: '0.75rem',
    fontSize: '1.5rem',
    textAlign: 'center' as const,
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    letterSpacing: '0.5rem',
    border: '2px solid var(--green-mid)',
    borderRadius: 'var(--radius)',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
};
