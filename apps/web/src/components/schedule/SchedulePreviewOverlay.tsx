import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { apiRequest } from '../../api/client.js';
import { useAuth } from '../../contexts/AuthContext.js';
import { useFocusTrap } from '../../hooks/useFocusTrap.js';
import { usePrintSettings } from '../../hooks/usePrintSettings.js';
import { LoadingOverlay } from '../LoadingOverlay.js';
import { CalendarGrid } from './CalendarGrid.js';
import { formatDate, formatTime } from '@ptowl/shared';
import type { Schedule, Appointment } from '@ptowl/shared';

// Lazy-load the full interactive calendar (shared chunk with SchedulePage)
const PTCalendar = lazy(() => import('./PTCalendar.js').then((m) => ({ default: m.PTCalendar })));

// ── Helpers ──

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

// ── Props ──

interface SchedulePreviewOverlayProps {
  schedule: Schedule;
  appointments: Appointment[];
  stats: {
    completed: number;
    todayCount: number;
    upcoming: number;
    nextAppt: Appointment | undefined;
    total: number;
  };
  onClose: () => void;
  onToggleReminder: (apptId: string, newValue: number) => void;
}

// ── Component ──

export function SchedulePreviewOverlay({
  schedule,
  appointments,
  stats,
  onClose,
  onToggleReminder,
}: SchedulePreviewOverlayProps) {
  const { user } = useAuth();
  const { settings: printSettings } = usePrintSettings();
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [printPreview, setPrintPreview] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [patientCode, setPatientCode] = useState<string | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [patientEmail, setPatientEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const trapRef = useFocusTrap(true);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Escape key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (printPreview) {
          setPrintPreview(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, printPreview]);

  // Reminder toggle
  const handleToggleReminder = async (apptId: string, currentValue: number) => {
    const result = await apiRequest<Appointment>(`/appointments/${apptId}`, {
      method: 'PATCH',
      body: JSON.stringify({ reminder_sent: currentValue ? 0 : 1 }),
    });
    if (result.ok && result.data) {
      onToggleReminder(apptId, result.data.reminder_sent);
    }
  };

  // Generate or show share link
  const handleShare = useCallback(async () => {
    if (shareUrl) {
      setShowSharePanel(true);
      return;
    }
    setShareLoading(true);
    try {
      const result = await apiRequest<{ share_token: string }>(`/schedules/${schedule.id}/share`, {
        method: 'POST',
      });
      if (result.ok && result.data) {
        // API is mounted at /api/* on the canonical origin (see
        // apps/api/wrangler.jsonc routes). The earlier api.ptowl.com
        // subdomain rewrite never had DNS, so it returned a broken URL
        // in production.
        const url = `${window.location.origin}/api/v1/cal/${result.data.share_token}.ics`;
        setShareUrl(url);
        setShowSharePanel(true);
      }
    } catch {
      // Silently fail
    }
    setShareLoading(false);
  }, [schedule.id, shareUrl]);

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied!');
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      toast.success('Link copied!');
    }
  }, [shareUrl]);

  const handleGeneratePatientCode = useCallback(async () => {
    if (patientCode) return;
    setCodeLoading(true);
    try {
      const body: Record<string, string> = {};
      if (patientEmail && patientEmail.includes('@')) {
        body.patientEmail = patientEmail;
      }
      const result = await apiRequest<{ code: string; email_sent?: boolean }>(`/codes/${schedule.id}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (result.ok && result.data) {
        setPatientCode(result.data.code);
        if (result.data.email_sent) {
          setEmailSent(true);
          toast.success(`Code sent to ${patientEmail}`);
        }
      }
    } catch {
      toast.error('Failed to generate code');
    }
    setCodeLoading(false);
  }, [schedule.id, patientCode, patientEmail]);

  const handleCopyCode = useCallback(async () => {
    if (!patientCode) return;
    try {
      await navigator.clipboard.writeText(patientCode);
      toast.success('Code copied!');
    } catch {
      toast.success('Code: ' + patientCode);
    }
  }, [patientCode]);

  // Week groupings for table view
  const weekGroups = useMemo(() => {
    const groups: Array<{ week: number; appts: Array<{ appt: Appointment; index: number }> }> = [];
    let currentWeek = -1;
    appointments.forEach((appt, i) => {
      const week = getWeekNumber(appt.appointment_date, schedule.start_date);
      if (week !== currentWeek) {
        groups.push({ week, appts: [] });
        currentWeek = week;
      }
      groups[groups.length - 1]!.appts.push({ appt, index: i });
    });
    return groups;
  }, [appointments, schedule.start_date]);

  return (
    <div
      className="schedule-preview-overlay"
      style={s.overlay}
      onClick={printPreview ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Schedule preview for ${schedule.patient_alias || schedule.patient_initials}`}
    >
      <div
        ref={trapRef}
        className="schedule-preview-modal"
        style={s.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="schedule-preview-header" style={s.header}>
          <div style={s.headerInfo}>
            {printPreview ? (
              <div style={s.headerRow}>
                <button style={s.backBtn} onClick={() => setPrintPreview(false)}>
                  &larr; Back
                </button>
                <h2 style={s.headerTitle}>Print Preview</h2>
              </div>
            ) : (
              <>
                <h2 style={s.headerTitle}>
                  {schedule.patient_alias || schedule.patient_initials}
                </h2>
                <span style={s.headerDate}>
                  {formatDate(schedule.start_date)} &ndash; {formatDate(schedule.end_date)}
                </span>
                <div style={s.statsBadges}>
                  <span style={s.badge}>{stats.total} total</span>
                  <span style={{ ...s.badge, color: 'var(--gray-text)' }}>
                    {stats.completed} done
                  </span>
                  <span style={{ ...s.badge, color: 'var(--orange-mid)' }}>
                    {stats.upcoming} left
                  </span>
                  {stats.todayCount > 0 && (
                    <span style={{ ...s.badge, color: 'var(--green-mid)', fontWeight: 700 }}>
                      {stats.todayCount} today
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            style={s.closeBtn}
            onClick={onClose}
            aria-label="Close schedule preview"
          >
            &times;
          </button>
        </div>

        {/* ── Tab Bar (hidden in print preview) ── */}
        {!printPreview && (
          <div className="schedule-preview-tabs" style={s.tabBar} role="tablist">
            <button
              role="tab"
              aria-selected={view === 'table'}
              style={view === 'table' ? s.tabActive : s.tab}
              onClick={() => setView('table')}
            >
              Table
            </button>
            <button
              role="tab"
              aria-selected={view === 'calendar'}
              style={view === 'calendar' ? s.tabActive : s.tab}
              onClick={() => setView('calendar')}
            >
              Calendar
            </button>
          </div>
        )}

        {/* ── Content ── */}
        <div
          className="schedule-preview-content"
          style={s.content}
          role="tabpanel"
        >
          {printPreview ? (
            /* ── Print Preview Layout ── */
            <div className="schedule-preview-print-area" style={s.printArea}>
              {/* Clinic header */}
              {printSettings.showClinicHeader && (
                <div style={s.printClinicHeader}>
                  {user?.logo_url && (
                    <img src={user.logo_url} alt="Clinic logo" style={s.printLogo} />
                  )}
                  <div style={s.printClinicInfo}>
                    {user?.clinic_name && <div style={{ fontWeight: 700 }}>{user.clinic_name}</div>}
                    {user?.clinic_address && <div>{user.clinic_address}</div>}
                    {user?.clinic_phone && <div>{user.clinic_phone}</div>}
                    {user?.clinic_email && <div>{user.clinic_email}</div>}
                  </div>
                </div>
              )}

              {/* Title */}
              <div style={s.printTitle}>Appointment Schedule</div>
              <div style={s.printSubtitle}>
                {schedule.patient_alias || schedule.patient_initials} &middot;{' '}
                {formatDate(schedule.start_date)} &ndash; {formatDate(schedule.end_date)}
              </div>

              {/* Table or Calendar content */}
              {view === 'table' ? (
                <table style={s.printTable}>
                  <thead>
                    <tr>
                      <th scope="col" style={s.printTh}>#</th>
                      <th scope="col" style={s.printTh}>Date</th>
                      <th scope="col" style={s.printTh}>Time</th>
                      <th scope="col" style={s.printTh}>Provider</th>
                      <th scope="col" style={s.printTh}>Status</th>
                      {printSettings.showReminderColumn && <th scope="col" style={s.printTh}>Reminder</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {weekGroups.map((group) => (
                      <React.Fragment key={`pw-${group.week}`}>
                        <tr>
                          <td
                            colSpan={printSettings.showReminderColumn ? 6 : 5}
                            style={s.printWeekHeader}
                          >
                            Week {group.week}
                          </td>
                        </tr>
                        {group.appts.map(({ appt, index }) => {
                          const status = getAppointmentStatus(appt.appointment_date);
                          return (
                            <tr key={appt.id} style={index % 2 === 1 ? s.printRowAlt : undefined}>
                              <td style={s.printTd}>{index + 1}</td>
                              <td style={s.printTd}>{formatDate(appt.appointment_date)}</td>
                              <td style={s.printTd}>{formatTime(appt.appointment_time)}</td>
                              <td style={s.printTd}>{appt.provider_name || '\u2014'}</td>
                              <td style={s.printTd}>{statusLabels[status]}</td>
                              {printSettings.showReminderColumn && (
                                <td style={s.printTd}>
                                  {appt.reminder_sent ? 'Sent' : 'Not sent'}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              ) : (
                <CalendarGrid
                  appointments={appointments}
                  startDate={schedule.start_date}
                  endDate={schedule.end_date}
                />
              )}

              {/* Notes section */}
              {printSettings.showNotesSection && (
                <div style={s.printNotes}>
                  <strong>Notes:</strong>
                  <div style={s.printNotesLine} />
                  <div style={s.printNotesLine} />
                </div>
              )}

              {/* Footer */}
              <div style={s.printFooter}>
                Generated by PTOWL on {new Date().toLocaleString()}
              </div>
            </div>
          ) : view === 'table' ? (
            /* ── Table View ── */
            <table style={s.table}>
              <thead>
                <tr>
                  <th scope="col" style={s.th}>#</th>
                  <th scope="col" style={s.th}>Date</th>
                  <th scope="col" style={s.th}>Time</th>
                  <th scope="col" style={s.th}>Provider</th>
                  <th scope="col" style={s.th}>Status</th>
                  <th scope="col" style={s.th}>Reminder</th>
                </tr>
              </thead>
              <tbody>
                {weekGroups.map((group) => (
                  <React.Fragment key={`w-${group.week}`}>
                    <tr>
                      <td colSpan={6} style={s.weekHeader}>
                        Week {group.week}
                      </td>
                    </tr>
                    {group.appts.map(({ appt, index }) => {
                      const status = getAppointmentStatus(appt.appointment_date);
                      return (
                        <tr key={appt.id} style={index % 2 === 1 ? s.rowAlt : undefined}>
                          <td style={s.td}>{index + 1}</td>
                          <td style={s.td}>{formatDate(appt.appointment_date)}</td>
                          <td style={s.td}>{formatTime(appt.appointment_time)}</td>
                          <td style={s.td}>{appt.provider_name || '\u2014'}</td>
                          <td style={s.td}>
                            <span style={statusStyles[status]}>{statusLabels[status]}</span>
                          </td>
                          <td style={s.td}>
                            <button
                              style={appt.reminder_sent ? s.reminderSent : s.reminderNotSent}
                              onClick={() => handleToggleReminder(appt.id, appt.reminder_sent)}
                            >
                              {appt.reminder_sent ? 'Sent' : 'Not sent'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          ) : (
            /* ── Calendar View ── */
            <Suspense fallback={<LoadingOverlay message="Loading calendar..." />}>
              <PTCalendar
                appointments={appointments}
                startDate={schedule.start_date}
                endDate={schedule.end_date}
                onToggleReminder={handleToggleReminder}
              />
            </Suspense>
          )}
        </div>

        {/* ── Share Panel (simplified — patient code only) ── */}
        {showSharePanel && (
          <div style={s.sharePanel}>
            <div style={s.sharePanelHeader}>
              <strong style={s.sharePanelTitle}>Share with Patient</strong>
              <button style={s.sharePanelClose} onClick={() => setShowSharePanel(false)}>&times;</button>
            </div>

            {/* Patient code sharing */}
            <div>
              <strong style={{ fontSize: '0.8125rem', color: 'var(--dark)' }}>Patient Portal Code</strong>
              <p style={{ fontSize: '0.75rem', color: 'var(--gray-text)', margin: '0.25rem 0 0.75rem', lineHeight: 1.4 }}>
                Give this code to your patient so they can view their schedule.
                {!patientCode && ' Optionally enter their email to send it automatically.'}
              </p>
              {!patientCode && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="Patient email (optional)"
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.8125rem', border: '1px solid var(--gray-mid)', borderRadius: 'var(--radius)', outline: 'none' }}
                  />
                </div>
              )}
              {patientCode ? (
                <div>
                  <div style={s.shareLinkRow}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--green-dark)', letterSpacing: '0.05em' }}>
                      {patientCode}
                    </span>
                    <button style={s.copyBtn} onClick={handleCopyCode}>Copy</button>
                  </div>
                  {emailSent && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--green-mid)', marginTop: '0.5rem' }}>
                      Sent to {patientEmail}
                    </p>
                  )}
                </div>
              ) : (
                <button
                  style={{ ...s.copyBtn, width: '100%' }}
                  onClick={handleGeneratePatientCode}
                  disabled={codeLoading}
                >
                  {codeLoading ? 'Generating...' : 'Generate Code'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <div className="schedule-preview-footer" style={s.footer}>
          {printPreview ? (
            <button style={s.confirmPrintBtn} onClick={() => {
              window.print();
              window.dispatchEvent(new CustomEvent('ptowl-onboarding', { detail: 'print' }));
              if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                confetti({ particleCount: 60, spread: 50, origin: { y: 0.6 } });
              }
            }}>
              Confirm &amp; Print
            </button>
          ) : (
            <>
              <button style={s.shareBtn} onClick={() => setShowSharePanel(true)}>
                Share
              </button>
              <button style={s.printPreviewBtn} onClick={() => setPrintPreview(true)}>
                Print Preview
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Status helpers ──

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

// ── Styles ──

const s: Record<string, React.CSSProperties> = {
  // Overlay
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '1rem',
  },
  // Modal container
  modal: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '960px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },

  // ── Header ──
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1.25rem 1.5rem 0.75rem',
    borderBottom: '1px solid var(--gray-mid)',
  },
  headerInfo: { flex: 1 },
  headerRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  headerTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--dark)',
    margin: 0,
  },
  headerDate: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
    display: 'block',
    marginTop: '0.125rem',
  },
  statsBadges: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  badge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--dark)',
    background: 'var(--gray-light)',
    padding: '0.125rem 0.5rem',
    borderRadius: '12px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: 'var(--gray-text)',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0.25rem 0.5rem',
    marginLeft: '0.5rem',
  },
  backBtn: {
    background: 'var(--gray-light)',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '0.375rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    cursor: 'pointer',
    color: 'var(--dark)',
  },

  // ── Tab Bar ──
  tabBar: {
    display: 'flex',
    gap: 0,
    borderBottom: '2px solid var(--gray-mid)',
    padding: '0 1.5rem',
  },
  tab: {
    padding: '0.625rem 1.25rem',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--gray-text)',
    cursor: 'pointer',
  },
  tabActive: {
    padding: '0.625rem 1.25rem',
    background: 'none',
    border: 'none',
    borderBottom: '2px solid var(--green-mid)',
    marginBottom: '-2px',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
    cursor: 'pointer',
  },

  // ── Content ──
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '1rem 1.5rem',
  },

  // ── Table View ──
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden' as const,
  },
  th: {
    background: 'var(--green-light-alt, #B4E9A9)',
    color: 'var(--green-dark)',
    padding: '0.625rem 0.75rem',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: '0.8rem',
    borderBottom: '2px solid var(--green-mid)',
  },
  td: {
    padding: '0.5rem 0.75rem',
    borderBottom: '1px solid var(--gray-light)',
    fontSize: '0.85rem',
  },
  rowAlt: { background: 'var(--off-white)' },
  weekHeader: {
    background: 'var(--green-light)',
    padding: '0.375rem 0.75rem',
    fontWeight: 600,
    fontSize: '0.75rem',
    color: 'var(--green-dark)',
    borderBottom: '1px solid var(--green-mid)',
  },
  reminderSent: {
    background: 'none',
    border: 'none',
    color: 'var(--green-dark)',
    fontWeight: 600,
    fontSize: '0.8rem',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  reminderNotSent: {
    background: 'none',
    border: 'none',
    color: 'var(--orange-mid)',
    fontWeight: 600,
    fontSize: '0.8rem',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
    cursor: 'pointer',
  },

  // ── Footer ──
  footer: {
    padding: '0.75rem 1.5rem',
    borderTop: '1px solid var(--gray-mid)',
    display: 'flex',
    justifyContent: 'center',
    gap: '0.75rem',
  },
  printPreviewBtn: {
    padding: '0.625rem 2rem',
    background: 'var(--green-mid)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    border: 'none',
  },
  confirmPrintBtn: {
    padding: '0.625rem 2rem',
    background: 'var(--green-dark)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    border: 'none',
  },
  shareBtn: {
    padding: '0.625rem 1.5rem',
    background: 'var(--off-white)',
    color: 'var(--dark)',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    border: '1px solid var(--gray-mid)',
  },
  sharePanel: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid var(--gray-mid)',
    background: 'var(--off-white)',
  },
  sharePanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  sharePanelTitle: {
    fontSize: '0.95rem',
    color: 'var(--dark)',
  },
  sharePanelClose: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: 'var(--gray-text)',
    cursor: 'pointer',
    lineHeight: 1,
    padding: '0.125rem 0.375rem',
  },
  shareText: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
    marginBottom: '1rem',
  },
  shareQRWrap: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  shareLinkRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  shareLinkInput: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-mono)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    background: 'var(--white)',
    color: 'var(--dark)',
  },
  copyBtn: {
    padding: '0.5rem 1rem',
    background: 'var(--green-mid)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
    border: 'none',
    whiteSpace: 'nowrap' as const,
  },

  // ── Print Preview (on-screen paper simulation) ──
  printArea: {
    background: 'var(--white)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    padding: '2rem',
    maxWidth: '800px',
    margin: '0 auto',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  printClinicHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '2px solid var(--green-dark)',
    paddingBottom: '0.75rem',
    marginBottom: '1rem',
  },
  printLogo: {
    maxWidth: '80px',
    maxHeight: '80px',
  },
  printClinicInfo: {
    textAlign: 'right' as const,
    fontSize: '0.8rem',
    color: '#333',
  },
  printTitle: {
    textAlign: 'center' as const,
    fontSize: '1.2rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
    marginBottom: '0.25rem',
  },
  printSubtitle: {
    textAlign: 'center' as const,
    fontSize: '0.85rem',
    color: '#666',
    marginBottom: '1rem',
  },
  printTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.8rem',
  },
  printTh: {
    background: 'var(--green-light-alt, #B4E9A9)',
    color: 'var(--green-dark)',
    padding: '0.5rem 0.625rem',
    textAlign: 'left' as const,
    fontWeight: 600,
    fontSize: '0.75rem',
    border: '1px solid var(--gray-mid)',
  },
  printTd: {
    padding: '0.375rem 0.625rem',
    border: '1px solid var(--gray-mid)',
    fontSize: '0.75rem',
  },
  printWeekHeader: {
    background: 'var(--green-light)',
    padding: '0.375rem 0.625rem',
    fontWeight: 600,
    fontSize: '0.7rem',
    color: 'var(--green-dark)',
  },
  printRowAlt: {
    background: 'var(--off-white)',
  },
  printNotes: {
    marginTop: '1rem',
    fontSize: '0.8rem',
  },
  printNotesLine: {
    borderBottom: '1px solid #ccc',
    height: '1.25rem',
    marginTop: '0.25rem',
  },
  printFooter: {
    marginTop: '1rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid var(--gray-mid)',
    fontSize: '0.7rem',
    color: '#999',
  },
};
