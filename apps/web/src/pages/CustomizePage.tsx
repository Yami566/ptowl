import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { PageLayout } from '../components/layout/PageLayout.js';
import { usePageTitle } from '../hooks/usePageTitle.js';

export function CustomizePage() {
  usePageTitle('Customize');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <PageLayout>
    <div style={styles.page}>
      <header style={styles.header} className="ptowl-header">
        <OwlLogo size="md" linkTo="/dashboard" />
        <div style={{ display: 'flex', gap: '0.5rem' }} className="ptowl-header-actions">
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>
      <main id="main-content" style={styles.main} className="ptowl-main">
        <h1 style={styles.title}>Customize</h1>
        <p style={styles.subtitle}>Personalize your templates, print settings, and clinic info.</p>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Templates</h3>
          <p style={styles.sectionText}>Edit template names, frequency, duration, and time. Changes won't affect your 3-click main flow.</p>
          <button style={styles.sectionBtn} onClick={() => navigate('/customize/templates')}>Edit Templates</button>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Clinic Info</h3>
          <p style={styles.sectionText}>Set your clinic name, address, phone, and logo for printouts.</p>
          <button style={styles.sectionBtn} onClick={() => navigate('/profile')}>Edit Clinic Info</button>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Print Settings</h3>
          <p style={styles.sectionText}>Choose default print view (table or calendar), color accents, and layout preferences.</p>
          <button style={styles.sectionBtn} onClick={() => navigate('/customize/print')}>Edit Print Settings</button>
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
  main: { maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' },
  subtitle: { color: 'var(--gray-text)', marginBottom: '2rem' },
  section: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1rem', border: '1px solid var(--gray-mid)' },
  sectionTitle: { fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' },
  sectionText: { color: 'var(--gray-text)', fontSize: '0.875rem', marginBottom: '0.75rem' },
  sectionBtn: { padding: '0.5rem 1rem', background: 'var(--green-mid)', color: 'white', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500 },
};
