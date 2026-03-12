import { useEffect, useRef } from 'react';
import { formatDate, formatTime } from '@ptowl/shared';
import type { Appointment } from '@ptowl/shared';

interface AppointmentDetailPopoverProps {
  appointment: Appointment;
  position: { top: number; left: number };
  onClose: () => void;
  onToggleReminder?: (apptId: string, currentValue: number) => void;
}

function getStatus(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]!;
  if (dateStr < today) return 'Completed';
  if (dateStr === today) return 'Today';
  return 'Upcoming';
}

export function AppointmentDetailPopover({
  appointment,
  position,
  onClose,
  onToggleReminder,
}: AppointmentDetailPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const status = getStatus(appointment.appointment_date);

  return (
    <div
      ref={ref}
      style={{
        ...s.popover,
        top: position.top,
        left: Math.min(position.left, window.innerWidth - 280),
      }}
      role="dialog"
      aria-label="Appointment details"
    >
      <div style={s.header}>
        <span style={s.title}>Appointment Details</span>
        <button style={s.closeBtn} onClick={onClose} aria-label="Close">&times;</button>
      </div>

      <div style={s.body}>
        <div style={s.row}>
          <span style={s.label}>Date</span>
          <span style={s.value}>{formatDate(appointment.appointment_date)}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Time</span>
          <span style={s.value}>{formatTime(appointment.appointment_time)}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Provider</span>
          <span style={s.value}>{appointment.provider_name || '\u2014'}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Status</span>
          <span style={{
            ...s.statusBadge,
            color: status === 'Completed' ? 'var(--gray-text)' :
                   status === 'Today' ? 'var(--green-mid)' : 'var(--orange-mid)',
          }}>{status}</span>
        </div>
        <div style={s.row}>
          <span style={s.label}>Reminder</span>
          {onToggleReminder ? (
            <button
              style={appointment.reminder_sent ? s.reminderSent : s.reminderNotSent}
              onClick={() => onToggleReminder(appointment.id, appointment.reminder_sent)}
            >
              {appointment.reminder_sent ? 'Sent' : 'Not sent'}
            </button>
          ) : (
            <span style={s.value}>{appointment.reminder_sent ? 'Sent' : 'Not sent'}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  popover: {
    position: 'fixed',
    zIndex: 300,
    width: '260px',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    border: '1px solid var(--gray-mid)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.625rem 0.75rem',
    borderBottom: '1px solid var(--gray-light)',
    background: 'var(--off-white)',
  },
  title: {
    fontWeight: 600,
    fontSize: '0.8rem',
    color: 'var(--dark)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: 'var(--gray-text)',
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
  },
  body: {
    padding: '0.5rem 0.75rem',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.375rem 0',
    borderBottom: '1px solid var(--gray-light)',
  },
  label: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    fontWeight: 500,
  },
  value: {
    fontSize: '0.8rem',
    fontWeight: 500,
    color: 'var(--dark)',
  },
  statusBadge: {
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  reminderSent: {
    background: 'none',
    border: 'none',
    color: 'var(--green-dark)',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
  },
  reminderNotSent: {
    background: 'none',
    border: 'none',
    color: 'var(--orange-mid)',
    fontWeight: 600,
    fontSize: '0.8rem',
    cursor: 'pointer',
    padding: '0.125rem 0.375rem',
    borderRadius: '4px',
  },
};
