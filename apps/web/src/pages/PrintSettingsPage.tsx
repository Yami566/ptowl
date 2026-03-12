import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { usePrintSettings } from '../hooks/usePrintSettings.js';

export function PrintSettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings, updateSettings, resetSettings } = usePrintSettings();
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={s.page}>
      <header style={s.header}>
        <OwlLogo size="md" linkTo="/dashboard" />
        <button style={s.backBtn} onClick={() => navigate('/customize')}>Back to Customize</button>
      </header>

      <main id="main-content" style={s.main}>
        <h2 style={s.title}>Print Settings</h2>
        <p style={s.subtitle}>
          Customize how your schedules look when printed. Settings are saved to this device.
        </p>

        <div style={s.card}>
          <h3 style={s.sectionTitle}>Default Print View</h3>
          <div style={s.radioGroup}>
            <label style={s.radioLabel}>
              <input
                type="radio"
                name="defaultView"
                checked={settings.defaultView === 'table'}
                onChange={() => updateSettings({ defaultView: 'table' })}
              />
              <span style={s.radioText}>Table View</span>
              <span style={s.radioDesc}>Numbered list with date, time, and provider columns</span>
            </label>
            <label style={s.radioLabel}>
              <input
                type="radio"
                name="defaultView"
                checked={settings.defaultView === 'calendar'}
                onChange={() => updateSettings({ defaultView: 'calendar' })}
              />
              <span style={s.radioText}>Calendar View</span>
              <span style={s.radioDesc}>Month grid with appointments on dates</span>
            </label>
          </div>
        </div>

        <div style={s.card}>
          <h3 style={s.sectionTitle}>Print Content</h3>

          <label style={s.toggle}>
            <input
              type="checkbox"
              checked={settings.showClinicHeader}
              onChange={(e) => updateSettings({ showClinicHeader: e.target.checked })}
            />
            <span style={s.toggleText}>
              <strong>Clinic Header</strong>
              <span style={s.toggleDesc}>Show clinic name, address, phone, and logo at top of printout</span>
            </span>
          </label>

          <label style={s.toggle}>
            <input
              type="checkbox"
              checked={settings.showNotesSection}
              onChange={(e) => updateSettings({ showNotesSection: e.target.checked })}
            />
            <span style={s.toggleText}>
              <strong>Notes Section</strong>
              <span style={s.toggleDesc}>Include blank lines for handwritten notes at bottom</span>
            </span>
          </label>

          <label style={s.toggle}>
            <input
              type="checkbox"
              checked={settings.showReminderColumn}
              onChange={(e) => updateSettings({ showReminderColumn: e.target.checked })}
            />
            <span style={s.toggleText}>
              <strong>Reminder Column</strong>
              <span style={s.toggleDesc}>Show reminder sent/not sent status in table view</span>
            </span>
          </label>
        </div>

        <div style={s.actions}>
          <button style={s.resetBtn} onClick={resetSettings}>Reset to Defaults</button>
          <button style={s.previewBtn} onClick={() => window.print()}>Print Preview</button>
          <button
            style={saved ? s.savedBtn : s.saveBtn}
            onClick={handleSave}
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </main>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1rem 2rem', background: 'var(--white)', borderBottom: '1px solid var(--gray-mid)',
  },
  backBtn: {
    padding: '0.5rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontSize: '0.875rem',
  },
  main: { maxWidth: '640px', margin: '0 auto', padding: '2rem 1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' },
  subtitle: { color: 'var(--gray-text)', marginBottom: '1.5rem' },
  card: {
    background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '1.5rem',
    border: '1px solid var(--gray-mid)', marginBottom: '1rem',
  },
  sectionTitle: { fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' },
  radioGroup: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  radioLabel: {
    display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.5rem',
    borderRadius: 'var(--radius)', cursor: 'pointer',
  },
  radioText: { fontWeight: 500, fontSize: '0.875rem' },
  radioDesc: { display: 'block', fontSize: '0.75rem', color: 'var(--gray-text)', marginTop: '0.125rem' },
  toggle: {
    display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.625rem 0',
    borderBottom: '1px solid var(--gray-light)', cursor: 'pointer',
  },
  toggleText: { display: 'flex', flexDirection: 'column' as const, fontSize: '0.875rem' },
  toggleDesc: { fontSize: '0.75rem', color: 'var(--gray-text)', marginTop: '0.125rem' },
  actions: {
    display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem',
  },
  resetBtn: {
    padding: '0.5rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)',
    fontSize: '0.875rem', cursor: 'pointer',
  },
  previewBtn: {
    padding: '0.5rem 1rem', background: 'var(--orange-light)', color: 'var(--dark)',
    borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer',
  },
  saveBtn: {
    padding: '0.5rem 1.25rem', background: 'var(--green-mid)', color: 'white',
    borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
  },
  savedBtn: {
    padding: '0.5rem 1.25rem', background: 'var(--green-dark)', color: 'white',
    borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
  },
};
