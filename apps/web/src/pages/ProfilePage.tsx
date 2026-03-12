import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { apiRequest } from '../api/client.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';

export function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [clinicName, setClinicName] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (user) {
      setClinicName(user.clinic_name || '');
      setClinicAddress(user.clinic_address || '');
      setClinicPhone(user.clinic_phone || '');
      setClinicEmail(user.clinic_email || '');
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
    <div style={styles.page}>
      <header style={styles.header}>
        <OwlLogo size="md" linkTo="/dashboard" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <main id="main-content" style={styles.main}>
        <h2 style={styles.title}>Profile & Clinic Info</h2>
        <p style={styles.subtitle}>This information appears on your printed schedules.</p>

        <form onSubmit={handleSave} style={styles.form}>
          {message && <div style={isError ? styles.messageError : styles.messageSuccess}>{message}</div>}

          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Email</span>
            <span style={styles.infoValue}>{user.email}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Tier</span>
            <span style={styles.infoValue}>{user.tier === 'paid' ? 'Paid' : 'Free'}</span>
          </div>

          <hr style={styles.divider} />

          <label style={styles.label}>
            Clinic Name
            <input type="text" value={clinicName} onChange={(e) => setClinicName(e.target.value)} style={styles.input} maxLength={200} />
          </label>
          <label style={styles.label}>
            Clinic Address
            <textarea value={clinicAddress} onChange={(e) => setClinicAddress(e.target.value)} style={styles.textarea} maxLength={500} rows={2} />
          </label>
          <label style={styles.label}>
            Clinic Phone
            <input type="tel" value={clinicPhone} onChange={(e) => setClinicPhone(e.target.value)} style={styles.input} maxLength={20} />
          </label>
          <label style={styles.label}>
            Clinic Email
            <input type="email" value={clinicEmail} onChange={(e) => setClinicEmail(e.target.value)} style={styles.input} maxLength={254} />
          </label>

          <button type="submit" style={styles.saveBtn} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--white)', borderBottom: '1px solid var(--gray-mid)' },
  backBtn: { padding: '0.5rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontSize: '0.875rem' },
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
};
