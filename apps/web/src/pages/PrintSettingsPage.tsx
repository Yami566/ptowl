import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { PageLayout } from '../components/layout/PageLayout.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { usePrintSettings } from '../hooks/usePrintSettings.js';

export function PrintSettingsPage() {
  usePageTitle('Print Settings');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { settings, updateSettings, resetSettings } = usePrintSettings();

  if (!user) return null;

  return (
    <PageLayout>
    <div style={s.page}>
      <header style={s.header} className="ptowl-header">
        <OwlLogo size="md" linkTo="/" />
        <div style={{ display: 'flex', gap: '0.5rem' }} className="ptowl-header-actions">
          <details style={s.menuRoot} className="ptowl-menu">
            <summary style={s.menuSummary} aria-label="Open profile menu">Profile &#9662;</summary>
            <div style={s.menuPanel} role="menu">
              <button style={s.menuItem} role="menuitem" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button style={s.menuItem} role="menuitem" onClick={() => navigate('/profile')}>Profile &amp; Clinic Info</button>
              <button style={s.menuItem} role="menuitem" onClick={() => navigate('/customize/templates')}>Edit Templates</button>
              <button style={{ ...s.menuItem, ...s.menuItemDanger }} role="menuitem" onClick={logout}>Sign out</button>
            </div>
          </details>
        </div>
      </header>

      <main id="main-content" style={s.main} className="ptowl-main">
        <h1 style={s.title}>Print Settings</h1>
        <p style={s.subtitle}>
          Customize how your schedules look when printed. Settings are saved to this device.
        </p>

        <div style={s.card}>
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend style={s.sectionTitle}>Default Print View</legend>
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
          </fieldset>
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

          <label style={s.toggle}>
            <input
              type="checkbox"
              checked={settings.showQRCode}
              onChange={(e) => updateSettings({ showQRCode: e.target.checked })}
            />
            <span style={s.toggleText}>
              <strong>QR Code</strong>
              <span style={s.toggleDesc}>Include a QR code on printouts linking to the digital schedule</span>
            </span>
          </label>
        </div>

        <div style={s.card}>
          <h3 style={s.sectionTitle}>Language</h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--gray-text)', marginBottom: '0.75rem' }}>
            Translate column headers on printed schedules.
          </p>
          <div style={s.radioGroup}>
            <label style={s.radioLabel}>
              <input
                type="radio"
                name="language"
                checked={settings.language === 'en'}
                onChange={() => updateSettings({ language: 'en' })}
              />
              <span style={s.radioText}>English</span>
            </label>
            <label style={s.radioLabel}>
              <input
                type="radio"
                name="language"
                checked={settings.language === 'es'}
                onChange={() => updateSettings({ language: 'es' })}
              />
              <span style={s.radioText}>Espa&ntilde;ol</span>
            </label>
          </div>
        </div>

        <p style={s.autoSaveNote}>
          Settings save automatically as you change them.
        </p>
        <div style={s.actions} className="print-settings-actions">
          <button style={s.resetBtn} onClick={resetSettings}>Reset to Defaults</button>
          <button style={s.previewBtn} onClick={() => window.print()}>Print Preview</button>
        </div>
      </main>
    </div>
    </PageLayout>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1rem 2rem', background: 'var(--white)', borderBottom: '1px solid var(--gray-mid)',
  },
  menuRoot: { position: 'relative' as const },
  menuSummary: { listStyle: 'none' as const, cursor: 'pointer', padding: '0.625rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--dark)', userSelect: 'none' as const },
  menuPanel: { position: 'absolute' as const, top: 'calc(100% + 0.25rem)', right: 0, minWidth: '12rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-mid)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '0.25rem', display: 'flex', flexDirection: 'column' as const, gap: '0.125rem', zIndex: 50 },
  menuItem: { textAlign: 'left' as const, padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--dark)', cursor: 'pointer' },
  menuItemDanger: { color: 'var(--red-mid)', marginTop: '0.25rem', borderTop: '1px solid var(--gray-mid)', paddingTop: '0.5rem', borderRadius: 0 },
  main: { maxWidth: 'clamp(500px, 45vw, 840px)', margin: '0 auto', padding: '2rem 1.5rem' },
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
  autoSaveNote: {
    fontSize: '0.75rem', color: 'var(--gray-text)', fontStyle: 'italic' as const,
    marginTop: '0.5rem', marginBottom: '0', textAlign: 'right' as const,
  },
};
