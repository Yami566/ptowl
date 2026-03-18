import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { PageLayout } from '../components/layout/PageLayout.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';
import { CalendarGrid } from '../components/schedule/CalendarGrid.js';
import { formatDate, formatTime } from '@ptowl/shared';
import type { Schedule, Appointment } from '@ptowl/shared';
import { usePrintSettings } from '../hooks/usePrintSettings.js';
import '../styles/print.css';

// Lazy-load the full interactive calendar (only loaded when user switches to calendar view)
const PTCalendar = lazy(() => import('../components/schedule/PTCalendar.js').then(m => ({ default: m.PTCalendar })));

function getAppointmentStatus(dateStr: string): 'completed' | 'today' | 'upcoming' {
  const today = new Date().toISOString().split('T')[0]!;
  if (dateStr < today) return 'completed';
  if (dateStr === today) return 'today';
  return 'upcoming';
}

function getWeekNumber(apptDate: string, startDate: string): number {
  const start = new Date(startDate + 'T00:00:00Z');
  const appt = new Date(apptDate + 'T00:00:00Z');
  const diffDays = Math.floor((appt.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7) + 1;
}

export function SchedulePage() {
  usePageTitle('Schedule');
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'calendar'>('table');

  const { settings: printSettings } = usePrintSettings();

  useEffect(() => {
    if (!id) return;
    apiRequest<{ schedule: Schedule; appointments: Appointment[] }>(`/schedules/${id}`).then((r) => {
      if (r.ok && r.data) {
        setSchedule(r.data.schedule);
        setAppointments(r.data.appointments);
      }
      setLoading(false);
    });
  }, [id]);

  // Summary stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0]!;
    const completed = appointments.filter((a) => a.appointment_date < today).length;
    const todayCount = appointments.filter((a) => a.appointment_date === today).length;
    const upcoming = appointments.filter((a) => a.appointment_date > today).length;
    const nextAppt = appointments.find((a) => a.appointment_date >= today);
    return { completed, todayCount, upcoming, nextAppt, total: appointments.length };
  }, [appointments]);

  const toggleReminder = async (apptId: string, currentValue: number) => {
    const result = await apiRequest<Appointment>(`/appointments/${apptId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reminder_sent: currentValue ? 0 : 1 }),
    });
    if (result.ok && result.data) {
      setAppointments((prev) => prev.map((a) => (a.id === apptId ? { ...a, reminder_sent: result.data!.reminder_sent } : a)));
    }
  };

  if (loading) return <LoadingOverlay message="Loading schedule..." />;
  if (!schedule) return <div style={styles.loading}>Schedule not found</div>;

  // Pre-compute week groupings for table view
  const weekGroups: Array<{ week: number; appts: Array<{ appt: Appointment; index: number }> }> = [];
  let currentWeek = -1;
  appointments.forEach((appt, i) => {
    const week = getWeekNumber(appt.appointment_date, schedule.start_date);
    if (week !== currentWeek) {
      weekGroups.push({ week, appts: [] });
      currentWeek = week;
    }
    weekGroups[weekGroups.length - 1]!.appts.push({ appt, index: i });
  });

  return (
    <PageLayout>
    <div id="main-content" role="main" style={styles.page}>
      <h1 className="sr-only">Schedule Details</h1>
      {/* Screen header */}
      <header style={styles.header} className="no-print">
        <OwlLogo size="md" linkTo="/dashboard" />
        <div style={styles.headerActions}>
          <button
            style={styles.viewToggle}
            onClick={() => setView(view === 'table' ? 'calendar' : 'table')}
          >
            {view === 'table' ? 'Calendar View' : 'Table View'}
          </button>
          <button style={styles.printBtn} onClick={() => window.print()}>Print</button>
          <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>Back</button>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Print-only header (respects print settings) */}
      {printSettings.showClinicHeader && (
        <div className="print-only print-header">
          <div>
            {user?.logo_url && <img src={user.logo_url} alt="Clinic logo" className="clinic-logo" />}
          </div>
          <div className="clinic-info">
            {user?.clinic_name && <div style={{ fontWeight: 700 }}>{user.clinic_name}</div>}
            {user?.clinic_address && <div>{user.clinic_address}</div>}
            {user?.clinic_phone && <div>{user.clinic_phone}</div>}
            {user?.clinic_email && <div>{user.clinic_email}</div>}
          </div>
        </div>
      )}

      <div className="print-only print-title">Appointment Schedule</div>
      <div className="print-only print-subtitle">
        {schedule.patient_alias || schedule.patient_initials} &middot; {formatDate(schedule.start_date)} &ndash; {formatDate(schedule.end_date)}
      </div>

      {/* Screen info bar */}
      <div style={styles.infoBar} className="no-print">
        <h2 style={styles.patientName}>{schedule.patient_alias || schedule.patient_initials}</h2>
        <span style={styles.dateRange}>
          {formatDate(schedule.start_date)} &ndash; {formatDate(schedule.end_date)}
        </span>
        <span style={styles.apptCount}>{appointments.length} appointments</span>
      </div>

      {/* Summary stats bar */}
      <div style={styles.statsBar} className="no-print">
        <div style={styles.statCard}>
          <span style={styles.statNum}>{stats.total}</span>
          <span style={styles.statLabel}>Total</span>
        </div>
        <div style={styles.statCard}>
          <span style={{ ...styles.statNum, color: 'var(--gray-text)' }}>{stats.completed}</span>
          <span style={styles.statLabel}>Completed</span>
        </div>
        {stats.todayCount > 0 && (
          <div style={styles.statCard}>
            <span style={{ ...styles.statNum, color: 'var(--green-mid)' }}>{stats.todayCount}</span>
            <span style={styles.statLabel}>Today</span>
          </div>
        )}
        <div style={styles.statCard}>
          <span style={{ ...styles.statNum, color: 'var(--orange-mid)' }}>{stats.upcoming}</span>
          <span style={styles.statLabel}>Remaining</span>
        </div>
        {stats.nextAppt && (
          <div style={{ ...styles.statCard, flex: '1 1 auto' }}>
            <span style={{ ...styles.statNum, fontSize: '0.9rem', color: 'var(--green-dark)' }}>
              {formatDate(stats.nextAppt.appointment_date)} at {formatTime(stats.nextAppt.appointment_time)}
            </span>
            <span style={styles.statLabel}>Next Appointment</span>
          </div>
        )}
      </div>

      {/* Table View */}
      {view === 'table' && (
        <table style={styles.table} className="schedule-table">
          <thead>
            <tr>
              <th scope="col" style={styles.th}>#</th>
              <th scope="col" style={styles.th}>Date</th>
              <th scope="col" style={styles.th}>Time</th>
              <th scope="col" style={styles.th}>Provider</th>
              <th scope="col" style={styles.th}>Status</th>
              <th scope="col" style={styles.th}>Reminder</th>
            </tr>
          </thead>
          <tbody>
            {weekGroups.map((group) => (
              <React.Fragment key={`week-${group.week}`}>
                <tr>
                  <td colSpan={6} style={styles.weekHeader}>Week {group.week}</td>
                </tr>
                {group.appts.map(({ appt, index }) => {
                  const status = getAppointmentStatus(appt.appointment_date);
                  return (
                    <tr key={appt.id} style={index % 2 === 1 ? styles.rowAlt : undefined}>
                      <td style={styles.td}>{index + 1}</td>
                      <td style={styles.td}>{formatDate(appt.appointment_date)}</td>
                      <td style={styles.td}>{formatTime(appt.appointment_time)}</td>
                      <td style={styles.td}>{appt.provider_name || '\u2014'}</td>
                      <td style={styles.td}>
                        <span style={statusStyles[status]}>{statusLabels[status]}</span>
                      </td>
                      <td style={styles.td}>
                        <button
                          className={appt.reminder_sent ? 'reminder-sent no-print' : 'reminder-not-sent no-print'}
                          style={appt.reminder_sent ? styles.reminderSent : styles.reminderNotSent}
                          onClick={() => toggleReminder(appt.id, appt.reminder_sent)}
                        >
                          {appt.reminder_sent ? 'Sent' : 'Not sent'}
                        </button>
                        <span className="print-only" style={appt.reminder_sent ? { color: 'var(--print-sent)' } : { color: 'var(--print-not-sent)' }}>
                          {appt.reminder_sent ? 'Sent' : 'Not sent'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      )}

      {/* Calendar View — full interactive FullCalendar (lazy loaded) */}
      {view === 'calendar' && (
        <div className="no-print">
          <Suspense fallback={<LoadingOverlay message="Loading calendar..." />}>
            <PTCalendar
              appointments={appointments}
              startDate={schedule.start_date}
              endDate={schedule.end_date}
              onToggleReminder={toggleReminder}
            />
          </Suspense>
        </div>
      )}

      {/* Print-only calendar — lightweight CalendarGrid for print */}
      {view === 'calendar' && (
        <div className="print-only">
          <CalendarGrid
            appointments={appointments}
            startDate={schedule.start_date}
            endDate={schedule.end_date}
          />
        </div>
      )}

      {/* Print footer */}
      <div className="print-only print-footer">
        <span>Generated by PTOWL on {new Date().toLocaleString()}</span>
      </div>
      {printSettings.showNotesSection && (
        <div className="print-only print-notes">
          <strong>Notes:</strong>
          <div className="print-notes-line" />
          <div className="print-notes-line" />
        </div>
      )}

    </div>
    </PageLayout>
  );
}

const statusLabels: Record<string, string> = {
  completed: 'Completed',
  today: 'Today',
  upcoming: 'Upcoming',
};

const statusStyles: Record<string, React.CSSProperties> = {
  completed: { color: 'var(--gray-text)', fontSize: '0.8rem', fontWeight: 500 },
  today: { color: 'var(--green-mid)', fontSize: '0.8rem', fontWeight: 700 },
  upcoming: { color: 'var(--orange-mid)', fontSize: '0.8rem', fontWeight: 600 },
};

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--gray-text)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--white)', borderBottom: '1px solid var(--gray-mid)' },
  headerActions: { display: 'flex', gap: '0.5rem' },
  viewToggle: { padding: '0.5rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer' },
  printBtn: { padding: '0.5rem 1.25rem', background: 'var(--green-mid)', color: 'white', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 600 },
  backBtn: { padding: '0.625rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontSize: '0.875rem' },
  logoutBtn: { padding: '0.5rem 1rem', background: 'var(--red-light)', color: 'var(--red-mid)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500 },
  infoBar: { maxWidth: '960px', margin: '0 auto', padding: '1.5rem 1.5rem 0.5rem', display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' as const },
  patientName: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)' },
  dateRange: { fontSize: '0.875rem', color: 'var(--gray-text)' },
  apptCount: { fontSize: '0.8rem', color: 'var(--orange-mid)', fontWeight: 600 },
  statsBar: { maxWidth: '960px', margin: '0 auto', padding: '0.5rem 1.5rem 0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const },
  statCard: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '0.5rem 0.75rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-mid)', minWidth: '70px' },
  statNum: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' },
  statLabel: { fontSize: '0.7rem', color: 'var(--gray-text)', marginTop: '0.125rem' },
  table: { width: '100%', maxWidth: '960px', margin: '1rem auto', borderCollapse: 'collapse' as const, background: 'var(--white)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' as const },
  th: { background: 'var(--green-light-alt, #B4E9A9)', color: 'var(--green-dark)', padding: '0.75rem 1rem', textAlign: 'left' as const, fontWeight: 600, fontSize: '0.875rem', borderBottom: '2px solid var(--green-mid)' },
  td: { padding: '0.625rem 1rem', borderBottom: '1px solid var(--gray-light)', fontSize: '0.9rem' },
  rowAlt: { background: 'var(--off-white)' },
  weekHeader: { background: 'var(--green-light)', padding: '0.5rem 1rem', fontWeight: 600, fontSize: '0.8rem', color: 'var(--green-dark)', borderBottom: '1px solid var(--green-mid)' },
  reminderSent: { background: 'none', color: 'var(--green-dark)', fontWeight: 600, fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '4px' },
  reminderNotSent: { background: 'none', color: 'var(--orange-mid)', fontWeight: 600, fontSize: '0.8rem', padding: '0.25rem 0.5rem', borderRadius: '4px' },
};
