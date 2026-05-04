import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  sort_order: number;
}

interface PublicSchedule {
  patient_initials: string;
  patient_alias: string;
  start_date: string;
  end_date: string;
  sessions_per_week: number;
  duration_weeks: number;
  clinic_name: string | null;
}

interface PublicScheduleResponse {
  ok: boolean;
  data?: {
    schedule: PublicSchedule;
    appointments: Appointment[];
    ics_url: string;
  };
  error?: { code: string; message: string };
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function formatDate(iso: string): { weekday: string; month: string; day: number } {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number];
  const dt = new Date(y, m - 1, d);
  return {
    weekday: WEEKDAY_LABELS[dt.getDay()] || '',
    month: MONTH_LABELS[dt.getMonth()] || '',
    day: dt.getDate(),
  };
}

function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Patient-facing schedule view.
 *
 * Public page; no authentication. The URL itself (`/p/:token`) is the
 * credential — possession of the unguessable 32-char token grants
 * read-only access to the schedule it was minted for. Same model as
 * the existing `.ics` calendar feed (apps/api/src/routes/calendar.ts).
 *
 * Designed mobile-first because patients receive this URL via SMS or
 * email and tap from their phone. Single-column, big tap targets, no
 * sign-up wall, no app install. The "Add to calendar" button hands
 * off to the corresponding `.ics` URL so the OS can subscribe via
 * webcal://, Google Calendar, or Apple Calendar.
 */
export function PatientSchedulePage() {
  const { token } = useParams<{ token: string }>();
  usePageTitle('Your appointments');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PublicScheduleResponse['data'] | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No schedule link provided.');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/v1/cal/json/${token}`);
        const body: PublicScheduleResponse = await res.json();
        if (cancelled) return;
        if (!res.ok || !body.ok || !body.data) {
          setError(
            body.error?.code === 'NOT_FOUND'
              ? "We couldn't find this schedule. The link may have expired or been revoked."
              : 'Something went wrong loading your schedule. Please try again later.',
          );
          setLoading(false);
          return;
        }
        setData(body.data);
        setLoading(false);
      } catch {
        if (!cancelled) {
          setError('Network error. Please check your connection and try again.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.center}>
          <OwlLogo size="md" />
          <p style={styles.subtle}>Loading your schedule…</p>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main style={styles.page}>
        <div style={styles.center}>
          <OwlLogo size="md" />
          <h1 style={styles.errorTitle}>Schedule not found</h1>
          <p style={styles.subtle}>{error || 'No data.'}</p>
          <p style={styles.tinyNote}>If your provider sent you this link, ask them to resend it.</p>
        </div>
      </main>
    );
  }

  const { schedule, appointments, ics_url } = data;
  const totalAppointments = appointments.length;
  const today = new Date().toISOString().split('T')[0]!;
  const upcoming = appointments.filter((a) => a.appointment_date >= today);
  const past = appointments.filter((a) => a.appointment_date < today);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <OwlLogo size="sm" />
        <p style={styles.tinyNote}>{schedule.clinic_name || 'Your PT clinic'}</p>
      </header>

      <section style={styles.heroCard}>
        <p style={styles.heroLabel}>Schedule for</p>
        <h1 style={styles.heroAlias}>{schedule.patient_alias || schedule.patient_initials}</h1>
        <p style={styles.heroMeta}>
          {schedule.sessions_per_week}× per week · {schedule.duration_weeks} weeks ·{' '}
          {totalAppointments} sessions total
        </p>
        <a href={ics_url} style={styles.ctaButton} aria-label="Add this schedule to your calendar">
          📅 Add to my calendar
        </a>
      </section>

      {upcoming.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>
            Upcoming · {upcoming.length} {upcoming.length === 1 ? 'session' : 'sessions'}
          </h2>
          <ul style={styles.list}>
            {upcoming.map((appt) => {
              const d = formatDate(appt.appointment_date);
              return (
                <li key={appt.id} style={styles.listItem}>
                  <div style={styles.dateBlock}>
                    <span style={styles.weekday}>{d.weekday}</span>
                    <span style={styles.day}>{d.day}</span>
                    <span style={styles.month}>{d.month}</span>
                  </div>
                  <div style={styles.timeBlock}>
                    <span style={styles.time}>{formatTime(appt.appointment_time)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitleMuted}>
            Past · {past.length} {past.length === 1 ? 'session' : 'sessions'}
          </h2>
          <ul style={styles.listMuted}>
            {past.map((appt) => {
              const d = formatDate(appt.appointment_date);
              return (
                <li key={appt.id} style={styles.listItemMuted}>
                  <span style={styles.mutedDate}>
                    {d.weekday}, {d.month} {d.day}
                  </span>
                  <span style={styles.mutedTime}>{formatTime(appt.appointment_time)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <footer style={styles.footer}>
        <p style={styles.tinyNote}>
          Powered by{' '}
          <a href="https://ptowl.com" style={styles.footerLink}>
            PTowl
          </a>{' '}
          · Patience Trainer Tool
        </p>
      </footer>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, var(--green-bg) 0%, #ffffff 30%)',
    padding: '1rem 1rem 3rem',
    maxWidth: '480px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '1rem',
    padding: '2rem 1rem',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1rem 0 0.5rem',
  },
  heroCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.75rem 1.25rem',
    boxShadow: '0 8px 24px rgba(15, 32, 39, 0.08)',
    border: '1px solid var(--green-bg)',
    textAlign: 'center',
    margin: '1rem 0 1.5rem',
  },
  heroLabel: {
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: '0.25rem',
  },
  heroAlias: {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--dark)',
    margin: '0 0 0.5rem',
    lineHeight: 1.1,
  },
  heroMeta: {
    fontSize: '0.95rem',
    color: 'var(--gray-text)',
    marginBottom: '1.5rem',
  },
  ctaButton: {
    display: 'inline-block',
    background: 'var(--green-mid)',
    color: 'var(--white)',
    padding: '0.875rem 1.5rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '1rem',
    fontWeight: 600,
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(102, 187, 106, 0.25)',
  },
  section: {
    marginBottom: '1.75rem',
  },
  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: 'var(--dark)',
    margin: '0 0 0.75rem',
    paddingLeft: '0.25rem',
  },
  sectionTitleMuted: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--gray-text)',
    margin: '0 0 0.75rem',
    paddingLeft: '0.25rem',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: 'var(--white)',
    padding: '0.875rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--green-bg)',
  },
  dateBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '52px',
  },
  weekday: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--orange-mid)',
  },
  day: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--dark)',
    lineHeight: 1,
  },
  month: {
    fontSize: '0.7rem',
    fontWeight: 500,
    color: 'var(--gray-text)',
    textTransform: 'uppercase',
  },
  timeBlock: {
    flex: 1,
  },
  time: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--dark)',
  },
  listMuted: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  listItemMuted: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0.75rem',
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
    borderBottom: '1px solid var(--green-bg)',
  },
  mutedDate: { fontWeight: 500 },
  mutedTime: { fontFamily: 'monospace' },
  footer: {
    marginTop: '2rem',
    textAlign: 'center',
    paddingTop: '1.5rem',
    borderTop: '1px solid var(--green-bg)',
  },
  footerLink: {
    color: 'var(--green-mid)',
    textDecoration: 'none',
    fontWeight: 600,
  },
  errorTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--dark)',
    margin: '1rem 0 0.5rem',
  },
  subtle: {
    color: 'var(--gray-text)',
    fontSize: '0.95rem',
    lineHeight: 1.5,
  },
  tinyNote: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
    margin: 0,
  },
};
