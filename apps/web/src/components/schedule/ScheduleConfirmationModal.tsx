import { useState, useEffect } from 'react';
import { CalendarGrid } from './CalendarGrid.js';
import { formatDate, formatTime } from '@ptowl/shared';
import type { GeneratedAppointment } from '@ptowl/shared';

interface ScheduleConfirmationModalProps {
  appointments: GeneratedAppointment[];
  patientAlias: string;
  patientInitials: string;
  startDate: string;
  endDate: string;
  sessionsPerWeek: number;
  durationWeeks: number;
  templateName: string;
  readOnly?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ScheduleConfirmationModal({
  appointments,
  patientAlias,
  patientInitials,
  startDate,
  endDate,
  sessionsPerWeek,
  durationWeeks,
  templateName,
  readOnly = false,
  onConfirm,
  onCancel,
}: ScheduleConfirmationModalProps) {
  const [tab, setTab] = useState<'table' | 'calendar'>('table');

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const displayName = patientAlias || patientInitials;

  return (
    <div style={s.overlay} onClick={onCancel} role="dialog" aria-modal="true" aria-label="Review schedule before saving">
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={s.header}>
          <h2 style={s.title}>{readOnly ? 'Schedule Review' : 'Review Schedule'}</h2>
          <p style={s.subtitle}>
            {displayName}
            {templateName && <> &middot; {templateName}</>}
          </p>
          <div style={s.metaRow}>
            <span style={s.metaBadge}>{formatDate(startDate)} &ndash; {formatDate(endDate)}</span>
            <span style={s.metaBadge}>{sessionsPerWeek}x/wk &middot; {durationWeeks} weeks</span>
            <span style={s.metaBadgeHighlight}>{appointments.length} appointments</span>
          </div>
        </div>

        {/* Tab toggle */}
        <div style={s.tabBar}>
          <button
            style={tab === 'table' ? s.tabActive : s.tab}
            onClick={() => setTab('table')}
          >
            Table View
          </button>
          <button
            style={tab === 'calendar' ? s.tabActive : s.tab}
            onClick={() => setTab('calendar')}
          >
            Calendar View
          </button>
        </div>

        {/* Content */}
        <div style={s.content}>
          {tab === 'table' && (
            <table style={s.table}>
              <thead>
                <tr>
                  <th scope="col" style={s.th}>#</th>
                  <th scope="col" style={s.th}>Date</th>
                  <th scope="col" style={s.th}>Day</th>
                  <th scope="col" style={s.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((appt, i) => (
                  <tr key={i} style={i % 2 === 1 ? s.rowAlt : undefined}>
                    <td style={s.td}>{i + 1}</td>
                    <td style={s.td}>{formatDate(appt.appointment_date)}</td>
                    <td style={s.td}>{appt.day_of_week}</td>
                    <td style={s.td}>{formatTime(appt.appointment_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === 'calendar' && (
            <CalendarGrid
              appointments={appointments}
              startDate={startDate}
              endDate={endDate}
              compact
            />
          )}
        </div>

        {/* Footer */}
        <div style={s.footer}>
          {readOnly ? (
            <button style={s.confirmBtn} onClick={onCancel}>Close</button>
          ) : (
            <>
              <button style={s.cancelBtn} onClick={onCancel}>Go Back</button>
              <button style={s.confirmBtn} onClick={onConfirm}>Confirm &amp; Save</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
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
  modal: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  header: {
    padding: '1.5rem 1.5rem 0.75rem',
    borderBottom: '1px solid var(--gray-mid)',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.25rem',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'var(--gray-text)',
    marginBottom: '0.75rem',
  },
  metaRow: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  metaBadge: {
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    background: 'var(--gray-light)',
    borderRadius: '4px',
    color: 'var(--dark)',
  },
  metaBadgeHighlight: {
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    background: 'var(--orange-light)',
    borderRadius: '4px',
    color: 'var(--green-dark)',
    fontWeight: 600,
  },
  tabBar: {
    display: 'flex',
    borderBottom: '1px solid var(--gray-mid)',
    padding: '0 1.5rem',
  },
  tab: {
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    background: 'none',
    color: 'var(--gray-text)',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
  },
  tabActive: {
    padding: '0.625rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    background: 'none',
    color: 'var(--green-dark)',
    borderBottom: '2px solid var(--green-mid)',
    cursor: 'pointer',
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '1rem 1.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.9rem',
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
  rowAlt: {
    background: 'var(--off-white)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid var(--gray-mid)',
  },
  cancelBtn: {
    padding: '0.625rem 1.25rem',
    background: 'var(--gray-light)',
    borderRadius: 'var(--radius)',
    fontSize: '0.9rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmBtn: {
    padding: '0.625rem 1.25rem',
    background: 'var(--green-mid)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
