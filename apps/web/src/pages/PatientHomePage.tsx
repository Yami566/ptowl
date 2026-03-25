import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { useAuth } from '../contexts/AuthContext.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { apiRequest } from '../api/client.js';
import { PatientCodeModal } from '../components/PatientCodeModal.js';

interface PatientSchedule {
  id: string;
  patient_alias: string;
  start_date: string;
  end_date: string;
  sessions_per_week: number;
  duration_weeks: number;
  clinic_name?: string;
  clinic_phone?: string;
  linked_at: string;
}

/** Generate an ICS calendar file string for a schedule */
function generateICS(schedule: PatientSchedule): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Patient Owl//PTOWL//EN',
    'BEGIN:VEVENT',
    `DTSTART:${schedule.start_date.replace(/-/g, '')}`,
    `DTEND:${schedule.end_date.replace(/-/g, '')}`,
    `SUMMARY:PT Schedule - ${schedule.clinic_name || 'Physical Therapy'}`,
    `DESCRIPTION:${schedule.sessions_per_week}x/week for ${schedule.duration_weeks} weeks`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

/** Generate a Google Calendar URL for a schedule */
function googleCalUrl(schedule: PatientSchedule): string {
  const title = encodeURIComponent(`PT Schedule - ${schedule.clinic_name || 'Physical Therapy'}`);
  const details = encodeURIComponent(`${schedule.sessions_per_week}x/week for ${schedule.duration_weeks} weeks`);
  const start = schedule.start_date.replace(/-/g, '');
  const end = schedule.end_date.replace(/-/g, '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

function downloadICS(schedule: PatientSchedule) {
  const ics = generateICS(schedule);
  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pt-schedule-${schedule.id.slice(0, 8)}.ics`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success('Calendar file downloaded!');
}

export function PatientHomePage() {
  usePageTitle('My Schedules');
  const { user, logout } = useAuth();
  const { code } = useParams<{ code?: string }>();
  const [schedules, setSchedules] = useState<PatientSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCodeModal, setShowCodeModal] = useState(false);

  const fetchSchedules = useCallback(async () => {
    const result = await apiRequest<PatientSchedule[]>('/patient/schedules');
    if (result.ok && result.data) {
      setSchedules(result.data);
    } else if (!result.ok) {
      toast.error(result.error?.message || 'Failed to load schedules. Please try again.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  // Deep link: auto-open code modal if /link/:code URL
  useEffect(() => {
    if (code) setShowCodeModal(true);
  }, [code]);

  const today = new Date().toISOString().split('T')[0]!;
  const nextSchedule = schedules.find(s => s.end_date >= today);

  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <OwlLogo size="sm" linkTo="/" />
          <h1 style={styles.title}>My Schedules</h1>
          <button onClick={logout} style={styles.logoutBtn}>Log out</button>
        </header>

        {loading ? (
          <div style={styles.loadingCard}>Loading your schedules...</div>
        ) : schedules.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>No schedules linked yet.</p>
            <p style={styles.emptySubtext}>
              Ask your provider for a code to link your schedule.
            </p>
            <button onClick={() => setShowCodeModal(true)} style={styles.addBtn} aria-label="Enter a schedule code from your provider">
              Enter a code
            </button>
          </div>
        ) : (
          <>
            {nextSchedule && (
              <div style={styles.nextCard}>
                <span style={styles.nextLabel}>Next schedule</span>
                <Link to={`/my-schedules/${nextSchedule.id}`} style={styles.nextLink}>
                  {nextSchedule.clinic_name || 'My Schedule'} — ends {new Date(nextSchedule.end_date).toLocaleDateString()}
                </Link>
              </div>
            )}

            <div style={styles.scheduleList}>
              {schedules.map((s) => (
                <div key={s.id} style={styles.scheduleCard} role="article" aria-label={`Schedule from ${s.clinic_name || 'clinic'}`}>
                  <Link to={`/my-schedules/${s.id}`} style={styles.cardLink}>
                    <div style={styles.cardTop}>
                      <span style={styles.clinicName}>{s.clinic_name || 'Unknown Clinic'}</span>
                      <span style={styles.dates}>
                        {new Date(s.start_date).toLocaleDateString()} — {new Date(s.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={styles.cardBottom}>
                      <span style={styles.sessions}>
                        {s.sessions_per_week}x/wk for {s.duration_weeks} weeks
                      </span>
                    </div>
                  </Link>
                  {/* Calendar sync buttons */}
                  <div style={styles.calendarActions}>
                    <button onClick={() => downloadICS(s)} style={styles.calBtn} title="Download .ics file">
                      📅 Add to Calendar
                    </button>
                    <a href={googleCalUrl(s)} target="_blank" rel="noopener noreferrer" style={styles.calBtn} title="Open in Google Calendar">
                      📆 Google Calendar
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setShowCodeModal(true)} style={styles.addBtnOutline}>
              + Add another schedule
            </button>
          </>
        )}

        {showCodeModal && (
          <PatientCodeModal
            initialCode={code}
            onClose={() => setShowCodeModal(false)}
            onLinked={() => { setShowCodeModal(false); fetchSchedules(); }}
          />
        )}
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)', padding: '2rem 1rem' },
  container: { maxWidth: 'clamp(400px, 50vw, 640px)', margin: '0 auto' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' },
  title: { flex: 1, fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)' },
  logoutBtn: { background: 'none', border: 'none', color: 'var(--gray-text)', fontSize: '0.8125rem', cursor: 'pointer', textDecoration: 'underline' },
  loadingCard: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center', color: 'var(--gray-text)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  emptyCard: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' },
  emptyText: { fontSize: '1.125rem', fontWeight: 600, color: 'var(--dark)', marginBottom: '0.5rem' },
  emptySubtext: { fontSize: '0.875rem', color: 'var(--gray-text)', marginBottom: '1.5rem', lineHeight: 1.5 },
  addBtn: { padding: '0.75rem 1.5rem', background: 'var(--green-mid)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' },
  nextCard: { background: 'var(--green-bg)', borderRadius: 'var(--radius)', padding: '1rem 1.25rem', marginBottom: '1rem', borderLeft: '3px solid var(--green-mid)' },
  nextLabel: { display: 'block', fontSize: '0.6875rem', fontWeight: 600, color: 'var(--green-dark)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '0.25rem' },
  nextLink: { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--green-dark)', textDecoration: 'none' },
  scheduleList: { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem', marginBottom: '1.5rem' },
  scheduleCard: { background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid var(--gray-mid)', overflow: 'hidden' },
  cardLink: { display: 'block', padding: '1.25rem', textDecoration: 'none' },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  clinicName: { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--dark)' },
  dates: { fontSize: '0.75rem', color: 'var(--gray-text)' },
  cardBottom: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  sessions: { fontSize: '0.8125rem', color: 'var(--gray-text)' },
  calendarActions: { display: 'flex', gap: '0.5rem', padding: '0.5rem 1.25rem 1rem', borderTop: '1px solid var(--gray-light)' },
  calBtn: { padding: '0.4rem 0.75rem', background: 'var(--gray-light)', border: '1px solid var(--gray-mid)', borderRadius: 'var(--radius)', fontSize: '0.75rem', fontWeight: 500, color: 'var(--dark)', cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  addBtnOutline: { display: 'block', width: '100%', padding: '0.75rem', background: 'none', border: '2px dashed var(--gray-mid)', borderRadius: 'var(--radius)', color: 'var(--gray-text)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', textAlign: 'center' },
};
