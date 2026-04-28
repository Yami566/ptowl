import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
import { useOwlReaction } from '../hooks/useOwlReaction.js';
import { QRCodeSVG } from 'qrcode.react';
import '../styles/print.css';

const headerTranslations: Record<string, Record<string, string>> = {
  en: {
    '#': '#',
    Date: 'Date',
    Time: 'Time',
    Provider: 'Provider',
    Status: 'Status',
    Reminder: 'Reminder',
    Week: 'Week',
  },
  es: {
    '#': '#',
    Date: 'Fecha',
    Time: 'Hora',
    Provider: 'Proveedor',
    Status: 'Estado',
    Reminder: 'Recordatorio',
    Week: 'Semana',
  },
};

// Lazy-load the full interactive calendar (only loaded when user switches to calendar view)
const PTCalendar = lazy(() =>
  import('../components/schedule/PTCalendar.js').then((m) => ({ default: m.PTCalendar })),
);

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
  const t = headerTranslations[printSettings.language] || headerTranslations.en!;
  const owlReaction = useOwlReaction();

  const handleNativeShare = useCallback(async () => {
    const title = schedule ? `Schedule for ${schedule.patient_alias}` : 'PT Schedule';
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied!');
      } catch {
        toast.success('Copy this link: ' + url);
      }
    }
  }, [schedule]);

  // Add-to-Calendar: lazily fetch the public share token (creates one if
  // missing), then surface three one-tap subscribe links — Apple via
  // webcal://, Google via the official ?cid= flow, and a plain .ics URL
  // for everything else (Outlook, Android default, Fantastical, etc.).
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarToken, setCalendarToken] = useState<string | null>(null);

  const openAddToCalendar = useCallback(async () => {
    if (!id) return;
    if (!calendarToken) {
      const r = await apiRequest<{ share_token: string }>(`/schedules/${id}/share`, {
        method: 'POST',
      });
      if (!r.ok || !r.data?.share_token) {
        toast.error('Could not generate calendar link');
        return;
      }
      setCalendarToken(r.data.share_token);
    }
    setCalendarOpen(true);
  }, [id, calendarToken]);

  const calendarHttpsUrl = calendarToken ? `https://ptowl.com/api/v1/cal/${calendarToken}.ics` : '';
  const calendarWebcalUrl = calendarToken
    ? `webcal://ptowl.com/api/v1/cal/${calendarToken}.ics`
    : '';
  const calendarGoogleUrl = calendarToken
    ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(calendarHttpsUrl)}`
    : '';

  const copyCalendarUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(calendarHttpsUrl);
      toast.success('Calendar URL copied');
    } catch {
      toast.success('Copy this URL: ' + calendarHttpsUrl);
    }
  }, [calendarHttpsUrl]);

  useEffect(() => {
    if (!id) return;
    apiRequest<{ schedule: Schedule; appointments: Appointment[] }>(`/schedules/${id}`).then(
      (r) => {
        if (r.ok && r.data) {
          setSchedule(r.data.schedule);
          setAppointments(r.data.appointments);
        }
        setLoading(false);
      },
    );
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
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === apptId ? { ...a, reminder_sent: result.data!.reminder_sent } : a,
        ),
      );
    }
  };

  if (loading) return <LoadingOverlay message="Loading schedule..." />;
  if (!schedule) return <div style={styles.loading}>Schedule not found</div>;

  // Pre-compute week groupings for table view
  const weekGroups: Array<{ week: number; appts: Array<{ appt: Appointment; index: number }> }> =
    [];
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
        <header style={styles.header} className="no-print ptowl-header">
          <OwlLogo size="md" linkTo="/" />
          <div style={styles.headerActions} className="ptowl-header-actions">
            <button
              style={styles.viewToggle}
              onClick={() => setView(view === 'table' ? 'calendar' : 'table')}
            >
              {view === 'table' ? 'Calendar View' : 'Table View'}
            </button>
            <button
              style={styles.printBtn}
              onClick={() => {
                owlReaction.onPrint();
                window.print();
              }}
            >
              Print
            </button>
            <button
              style={styles.viewToggle}
              onClick={() => {
                owlReaction.onShare();
                handleNativeShare();
              }}
            >
              Share
            </button>
            <button style={styles.viewToggle} onClick={openAddToCalendar}>
              Add to Calendar
            </button>
            <button style={styles.backBtn} onClick={() => navigate('/dashboard')}>
              Back
            </button>
            <button style={styles.logoutBtn} onClick={logout}>
              Logout
            </button>
          </div>
        </header>

        {/* Print-only header (respects print settings) */}
        {printSettings.showClinicHeader && (
          <div className="print-only print-header">
            <div>
              {user?.logo_url && (
                <img src={user.logo_url} alt="Clinic logo" className="clinic-logo" />
              )}
            </div>
            <div className="clinic-info">
              {user?.clinic_name && <div style={{ fontWeight: 700 }}>{user.clinic_name}</div>}
              {user?.clinic_address && <div>{user.clinic_address}</div>}
              {user?.clinic_phone && <div>{user.clinic_phone}</div>}
              {user?.clinic_email && <div>{user.clinic_email}</div>}
            </div>
          </div>
        )}

        <div className="print-only print-title">
          {printSettings.language === 'es' ? 'Horario de Citas' : 'Appointment Schedule'}
        </div>
        <div className="print-only print-subtitle">
          {schedule.patient_alias || schedule.patient_initials} &middot;{' '}
          {formatDate(schedule.start_date)} &ndash; {formatDate(schedule.end_date)}
        </div>

        {/* Screen info bar */}
        <div style={styles.infoBar} className="no-print schedule-info-bar">
          <h2 style={styles.patientName}>{schedule.patient_alias || schedule.patient_initials}</h2>
          <span style={styles.dateRange}>
            {formatDate(schedule.start_date)} &ndash; {formatDate(schedule.end_date)}
          </span>
          <span style={styles.apptCount}>{appointments.length} appointments</span>
        </div>

        {/* Summary stats bar */}
        <div style={styles.statsBar} className="no-print schedule-stats-bar">
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
              <span style={{ ...styles.statNum, color: 'var(--green-mid)' }}>
                {stats.todayCount}
              </span>
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
                {formatDate(stats.nextAppt.appointment_date)} at{' '}
                {formatTime(stats.nextAppt.appointment_time)}
              </span>
              <span style={styles.statLabel}>Next Appointment</span>
            </div>
          )}
        </div>

        {/* Reminders panel — clinic only, hidden when printing or sharing */}
        <RemindersPanel schedule={schedule} onUpdated={(s) => setSchedule(s)} />

        {/* Table View */}
        {view === 'table' && (
          <div className="schedule-table-wrap">
            <table style={styles.table} className="schedule-table">
              <thead>
                <tr>
                  <th scope="col" style={styles.th}>
                    {t['#']}
                  </th>
                  <th scope="col" style={styles.th}>
                    {t['Date']}
                  </th>
                  <th scope="col" style={styles.th}>
                    {t['Time']}
                  </th>
                  <th scope="col" style={styles.th}>
                    {t['Provider']}
                  </th>
                  <th scope="col" style={styles.th}>
                    {t['Status']}
                  </th>
                  <th scope="col" style={styles.th}>
                    {t['Reminder']}
                  </th>
                </tr>
              </thead>
              <tbody>
                {weekGroups.map((group) => (
                  <React.Fragment key={`week-${group.week}`}>
                    <tr>
                      <td colSpan={6} style={styles.weekHeader}>
                        {t['Week']} {group.week}
                      </td>
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
                              className={
                                appt.reminder_sent
                                  ? 'reminder-sent no-print'
                                  : 'reminder-not-sent no-print'
                              }
                              style={
                                appt.reminder_sent ? styles.reminderSent : styles.reminderNotSent
                              }
                              onClick={() => toggleReminder(appt.id, appt.reminder_sent)}
                            >
                              {appt.reminder_sent ? 'Sent' : 'Not sent'}
                            </button>
                            <span
                              className="print-only"
                              style={
                                appt.reminder_sent
                                  ? { color: 'var(--print-sent)' }
                                  : { color: 'var(--print-not-sent)' }
                              }
                            >
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
          </div>
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

        {/* Print QR code */}
        {printSettings.showQRCode && schedule.share_token && (
          <div className="print-only" style={{ textAlign: 'center', margin: '1rem 0' }}>
            <QRCodeSVG value={`https://ptowl.com/s/${schedule.share_token}`} size={96} level="M" />
            <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.25rem' }}>
              Scan to view this schedule online
            </div>
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

      {calendarOpen && calendarToken && (
        <div
          className="no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-to-calendar-title"
          style={styles.calBackdrop}
          onClick={() => setCalendarOpen(false)}
        >
          <div style={styles.calCard} onClick={(e) => e.stopPropagation()}>
            <h3 id="add-to-calendar-title" style={styles.calTitle}>
              Add to Calendar
            </h3>
            <p style={styles.calSubtitle}>
              Subscribes the patient&apos;s appointments. Future edits sync automatically.
            </p>
            <a href={calendarWebcalUrl} style={styles.calRow}>
              📅 Apple Calendar (iOS / macOS)
            </a>
            <a
              href={calendarGoogleUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.calRow}
            >
              📆 Google Calendar
            </a>
            <button type="button" onClick={copyCalendarUrl} style={styles.calRow}>
              📋 Copy link (Outlook / Android / other)
            </button>
            <button type="button" onClick={() => setCalendarOpen(false)} style={styles.calClose}>
              Close
            </button>
          </div>
        </div>
      )}
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
  calBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  calCard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
  },
  calTitle: { fontSize: '1.125rem', fontWeight: 700, color: 'var(--dark)', margin: 0 },
  calSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
    marginTop: '0.25rem',
    marginBottom: '1rem',
  },
  calRow: {
    display: 'block',
    width: '100%',
    padding: '0.75rem 1rem',
    margin: '0.5rem 0',
    background: 'var(--off-white)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.95rem',
    color: 'var(--dark)',
    textDecoration: 'none',
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  calClose: {
    width: '100%',
    padding: '0.5rem',
    marginTop: '0.75rem',
    background: 'transparent',
    border: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    color: 'var(--gray-text)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: 'var(--white)',
    borderBottom: '1px solid var(--gray-mid)',
  },
  headerActions: { display: 'flex', gap: '0.5rem' },
  viewToggle: {
    padding: '0.5rem 1rem',
    background: 'var(--gray-light)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  printBtn: {
    padding: '0.5rem 1.25rem',
    background: 'var(--green-mid)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
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
  infoBar: {
    maxWidth: 'clamp(320px, 92vw, 1200px)',
    margin: '0 auto',
    padding: '1.5rem 1.5rem 0.5rem',
    display: 'flex',
    alignItems: 'baseline',
    gap: '1rem',
    flexWrap: 'wrap' as const,
  },
  patientName: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)' },
  dateRange: { fontSize: '0.875rem', color: 'var(--gray-text)' },
  apptCount: { fontSize: '0.8rem', color: 'var(--orange-mid)', fontWeight: 600 },
  statsBar: {
    maxWidth: 'clamp(320px, 92vw, 1200px)',
    margin: '0 auto',
    padding: '0.5rem 1.5rem 0.5rem',
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
  },
  statCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--gray-mid)',
    minWidth: '70px',
  },
  statNum: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)' },
  statLabel: { fontSize: '0.7rem', color: 'var(--gray-text)', marginTop: '0.125rem' },
  table: {
    width: '100%',
    maxWidth: 'clamp(320px, 92vw, 1200px)',
    margin: '1rem auto',
    borderCollapse: 'collapse' as const,
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden' as const,
  },
  th: {
    background: 'var(--green-light-alt, #B4E9A9)',
    color: 'var(--green-dark)',
    padding: '0.75rem 1rem',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: '0.875rem',
    borderBottom: '2px solid var(--green-mid)',
  },
  td: { padding: '0.625rem 1rem', borderBottom: '1px solid var(--gray-light)', fontSize: '0.9rem' },
  rowAlt: { background: 'var(--off-white)' },
  weekHeader: {
    background: 'var(--green-light)',
    padding: '0.5rem 1rem',
    fontWeight: 600,
    fontSize: '0.8rem',
    color: 'var(--green-dark)',
    borderBottom: '1px solid var(--green-mid)',
  },
  reminderSent: {
    background: 'none',
    color: 'var(--green-dark)',
    fontWeight: 600,
    fontSize: '0.8rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
  },
  reminderNotSent: {
    background: 'none',
    color: 'var(--orange-mid)',
    fontWeight: 600,
    fontSize: '0.8rem',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
  },
  remindersPanel: {
    maxWidth: 'clamp(320px, 92vw, 1200px)',
    margin: '0.75rem auto',
    padding: '1rem 1.25rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--gray-light)',
  },
  remindersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
    flexWrap: 'wrap' as const,
    gap: '0.5rem',
  },
  remindersTitle: { fontSize: '0.95rem', fontWeight: 600, color: 'var(--dark)', margin: 0 },
  remindersStatus: { fontSize: '0.8rem', color: 'var(--gray-text)' },
  remindersStatusOn: { color: 'var(--green-dark)', fontWeight: 600 },
  remindersForm: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    marginTop: '0.5rem',
  },
  remindersInput: {
    flex: 1,
    minWidth: '200px',
    padding: '0.5rem 0.75rem',
    fontSize: '0.9rem',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    background: 'var(--white)',
  },
  remindersBtn: {
    padding: '0.5rem 0.875rem',
    background: 'var(--green-mid)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  remindersBtnSecondary: {
    padding: '0.5rem 0.875rem',
    background: 'var(--gray-light)',
    color: 'var(--dark)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  remindersHelp: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    marginTop: '0.5rem',
    lineHeight: 1.45,
  },
};

interface RemindersPanelProps {
  schedule: Schedule;
  onUpdated: (updated: Schedule) => void;
}

/**
 * Clinic-only panel on /schedule/:id for adding/changing the patient
 * email reminders + toggling on/off. Email is encrypted at rest by
 * the API (PUT /:id/reminders); this panel only knows whether one is
 * set (`schedule.has_patient_email`) — never the plaintext.
 */
function RemindersPanel({ schedule, onUpdated }: RemindersPanelProps) {
  const [editing, setEditing] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const remindersOn = schedule.reminders_enabled === 1;
  const hasEmail = schedule.has_patient_email === 1;

  const persist = useCallback(
    async (body: { patient_email?: string | null; reminders_enabled?: boolean }) => {
      setBusy(true);
      const res = await apiRequest(`/schedules/${schedule.id}/reminders`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        // Optimistic local update; re-fetch is also fine but slower.
        onUpdated({
          ...schedule,
          reminders_enabled:
            body.reminders_enabled === undefined
              ? schedule.reminders_enabled
              : body.reminders_enabled
                ? 1
                : 0,
          has_patient_email:
            body.patient_email === undefined
              ? schedule.has_patient_email
              : body.patient_email
                ? 1
                : 0,
        });
        toast.success('Reminder settings saved');
      } else {
        toast.error(res.error?.message || 'Failed to save reminder settings');
      }
      setBusy(false);
    },
    [schedule, onUpdated],
  );

  const handleSaveEmail = async () => {
    const trimmed = emailDraft.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error('Please enter a valid email');
      return;
    }
    await persist({
      patient_email: trimmed || null,
      reminders_enabled: trimmed ? true : remindersOn,
    });
    setEditing(false);
    setEmailDraft('');
  };

  return (
    <section style={styles.remindersPanel} className="no-print">
      <div style={styles.remindersHeader}>
        <h3 style={styles.remindersTitle}>Patient reminders</h3>
        <span style={styles.remindersStatus}>
          {hasEmail && remindersOn ? (
            <span style={styles.remindersStatusOn}>
              ● Active — 24h + 1h before each appointment
            </span>
          ) : hasEmail && !remindersOn ? (
            <span>○ Email set — reminders paused</span>
          ) : (
            <span>○ No email set</span>
          )}
        </span>
      </div>

      {editing ? (
        <div style={styles.remindersForm}>
          <input
            type="email"
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="patient@example.com (or leave blank to clear)"
            style={styles.remindersInput}
            autoComplete="off"
            disabled={busy}
            aria-label="Patient email for reminders"
          />
          <button style={styles.remindersBtn} onClick={handleSaveEmail} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button
            style={styles.remindersBtnSecondary}
            onClick={() => {
              setEditing(false);
              setEmailDraft('');
            }}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div style={styles.remindersForm}>
          <button style={styles.remindersBtn} onClick={() => setEditing(true)} disabled={busy}>
            {hasEmail ? 'Change email' : 'Add patient email'}
          </button>
          {hasEmail && (
            <button
              style={styles.remindersBtnSecondary}
              onClick={() => persist({ reminders_enabled: !remindersOn })}
              disabled={busy}
            >
              {remindersOn ? 'Pause reminders' : 'Resume reminders'}
            </button>
          )}
          {hasEmail && (
            <button
              style={styles.remindersBtnSecondary}
              onClick={() => persist({ patient_email: null })}
              disabled={busy}
            >
              Clear email
            </button>
          )}
        </div>
      )}
      <p style={styles.remindersHelp}>
        Patient email is stored encrypted. Each reminder includes a one-click unsubscribe link. See{' '}
        <a href="/privacy" style={{ color: 'var(--green-mid)' }}>
          Privacy Policy
        </a>{' '}
        for details.
      </p>
    </section>
  );
}
