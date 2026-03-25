import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { apiRequest } from '../api/client.js';

interface ScheduleData {
  id: string;
  patient_alias: string;
  start_date: string;
  end_date: string;
  sessions_per_week: number;
  duration_weeks: number;
  notes: string;
  clinic_name?: string;
  clinic_phone?: string;
  clinic_email?: string;
}

interface AppointmentData {
  id: string;
  appointment_date: string;
  appointment_time: string;
  provider_name: string;
  reminder_sent: number;
  sort_order: number;
}

export function PatientSchedulePage() {
  usePageTitle('Schedule');
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const result = await apiRequest<{ schedule: ScheduleData; appointments: AppointmentData[] }>(
        `/patient/schedules/${id}`,
      );
      if (result.ok && result.data) {
        setSchedule(result.data.schedule);
        setAppointments(result.data.appointments);
      } else {
        setError(result.error?.message || 'Schedule not found');
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <main id="main-content" style={styles.page}>
        <div style={styles.container}>
          <p style={styles.loadingText}>Loading schedule...</p>
        </div>
      </main>
    );
  }

  if (error || !schedule) {
    return (
      <main id="main-content" style={styles.page}>
        <div style={styles.container}>
          <Link to="/my-schedules" style={styles.backLink}>&larr; Back to My Schedules</Link>
          <p style={styles.errorText}>{error || 'Schedule not found'}</p>
        </div>
      </main>
    );
  }

  const today = new Date().toISOString().split('T')[0]!;
  const completedCount = appointments.filter(a => a.appointment_date < today).length;
  const totalCount = appointments.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <main id="main-content" style={styles.page}>
      <div style={styles.container}>
        <Link to="/my-schedules" style={styles.backLink}>&larr; Back to My Schedules</Link>

        <header style={styles.header}>
          <OwlLogo size="sm" linkTo="/" />
          <div>
            <h1 style={styles.title}>{schedule.clinic_name || 'My Schedule'}</h1>
            <p style={styles.subtitle}>
              {new Date(schedule.start_date).toLocaleDateString()} — {new Date(schedule.end_date).toLocaleDateString()}
            </p>
          </div>
        </header>

        {/* Progress bar */}
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${pct}%` }} />
          </div>
          <p style={styles.progressText}>
            {completedCount} of {totalCount} sessions ({pct}%)
          </p>
        </div>

        {schedule.clinic_phone && (
          <p style={styles.clinicInfo}>
            Clinic phone: <a href={`tel:${schedule.clinic_phone}`} style={styles.inlineLink}>{schedule.clinic_phone}</a>
          </p>
        )}

        {/* Appointment table */}
        <div style={styles.tableWrapper}>
          <table style={styles.table} aria-label="Appointment schedule">
            <thead>
              <tr>
                <th scope="col" style={styles.th}>Date</th>
                <th scope="col" style={styles.th}>Time</th>
                <th scope="col" style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => {
                const isPast = appt.appointment_date < today;
                return (
                  <tr key={appt.id} style={isPast ? styles.rowPast : undefined}>
                    <td style={styles.td}>{new Date(appt.appointment_date).toLocaleDateString()}</td>
                    <td style={styles.td}>{appt.appointment_time}</td>
                    <td style={styles.td}>
                      <span style={isPast ? styles.statusDone : styles.statusUpcoming}>
                        {isPast ? 'Done' : 'Upcoming'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calendar sync */}
        <div style={styles.calendarActions}>
          <button onClick={() => {
            const lines = [
              'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Patient Owl//PTOWL//EN', 'BEGIN:VEVENT',
              `DTSTART:${schedule.start_date.replace(/-/g, '')}`,
              `DTEND:${schedule.end_date.replace(/-/g, '')}`,
              `SUMMARY:PT Schedule - ${schedule.clinic_name || 'Physical Therapy'}`,
              `DESCRIPTION:${schedule.sessions_per_week}x/week for ${schedule.duration_weeks} weeks`,
              'END:VEVENT', 'END:VCALENDAR',
            ];
            const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `pt-schedule.ics`; a.click();
            URL.revokeObjectURL(url);
          }} style={styles.calBtn}>
            📅 Add to Calendar
          </button>
          <a
            href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`PT Schedule - ${schedule.clinic_name || 'PT'}`)}&dates=${schedule.start_date.replace(/-/g, '')}/${schedule.end_date.replace(/-/g, '')}&details=${encodeURIComponent(`${schedule.sessions_per_week}x/week for ${schedule.duration_weeks} weeks`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={styles.calBtn}
          >
            📆 Google Calendar
          </a>
        </div>

        {schedule.notes && (
          <div style={styles.notesBox}>
            <strong>Notes from your clinic:</strong> {schedule.notes}
          </div>
        )}
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
    maxWidth: 'clamp(400px, 50vw, 720px)',
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
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--dark)',
  },
  subtitle: {
    fontSize: '0.8125rem',
    color: 'var(--gray-text)',
  },
  loadingText: {
    textAlign: 'center',
    color: 'var(--gray-text)',
    padding: '3rem',
  },
  errorText: {
    textAlign: 'center',
    color: 'var(--orange-mid)',
    padding: '3rem',
  },
  progressSection: {
    marginBottom: '1.5rem',
  },
  progressBar: {
    height: '10px',
    background: 'var(--gray-mid)',
    borderRadius: '999px',
    overflow: 'hidden',
    marginBottom: '0.5rem',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, var(--green-mid), var(--green-dark))',
    borderRadius: '999px',
    transition: 'width 0.5s ease',
  },
  progressText: {
    fontSize: '0.8125rem',
    color: 'var(--gray-text)',
    fontWeight: 500,
  },
  clinicInfo: {
    fontSize: '0.875rem',
    color: 'var(--dark-alt)',
    marginBottom: '1.5rem',
  },
  inlineLink: {
    color: 'var(--green-mid)',
    fontWeight: 500,
    textDecoration: 'underline',
  },
  tableWrapper: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    marginBottom: '1.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  th: {
    padding: '0.75rem 1rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--gray-text)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--gray-mid)',
    textAlign: 'left' as const,
  },
  td: {
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    color: 'var(--dark)',
    borderBottom: '1px solid var(--gray-light)',
  },
  rowPast: {
    opacity: 0.6,
  },
  statusDone: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--green-mid)',
  },
  statusUpcoming: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--orange-mid)',
  },
  calendarActions: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1.5rem',
  },
  calBtn: {
    padding: '0.5rem 1rem',
    background: 'var(--gray-light)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--dark)',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  },
  notesBox: {
    background: 'var(--green-bg)',
    borderRadius: 'var(--radius)',
    padding: '1rem',
    fontSize: '0.875rem',
    color: 'var(--dark-alt)',
    lineHeight: 1.5,
  },
};
