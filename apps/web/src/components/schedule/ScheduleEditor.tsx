import { useState, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, EventDropArg, EventClickArg } from '@fullcalendar/core';
import { formatTime } from '@ptowl/shared';
import type { GeneratedAppointment } from '@ptowl/shared';
import '../../styles/fullcalendar-theme.css';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface ScheduleEditorProps {
  appointments: GeneratedAppointment[];
  patientInitials: string;
  patientAlias: string;
  startDate: string;
  endDate: string;
  sessionsPerWeek: number;
  durationWeeks: number;
  appointmentTime: string;
  onSave: (editedAppointments: GeneratedAppointment[]) => void;
  onCancel: () => void;
}

export function ScheduleEditor({
  appointments: initialAppointments,
  patientInitials,
  patientAlias,
  startDate,
  endDate,
  sessionsPerWeek,
  durationWeeks,
  appointmentTime,
  onSave,
  onCancel,
}: ScheduleEditorProps) {
  const [appointments, setAppointments] = useState<GeneratedAppointment[]>(initialAppointments);
  const [changeCount, setChangeCount] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<{ id: string; el: HTMLElement } | null>(null);

  // Map appointments to FullCalendar events
  const events: EventInput[] = useMemo(() => {
    return appointments.map((appt, idx) => ({
      id: String(idx),
      title: `${formatTime(appt.appointment_time)} · ${appt.day_of_week}`,
      start: `${appt.appointment_date}T${appt.appointment_time}`,
      allDay: false,
      backgroundColor: '#FF7043',
      borderColor: '#E64A19',
      classNames: ['fc-event-upcoming'],
      extendedProps: { appointment: appt, index: idx },
    }));
  }, [appointments]);

  // Extend the valid range end by one day so FullCalendar includes the last appointment day
  const validEnd = useMemo(() => {
    const d = new Date(endDate + 'T00:00:00');
    d.setDate(d.getDate() + 7); // extra week buffer for drag targets
    return d.toISOString().split('T')[0];
  }, [endDate]);

  // Handle drag-and-drop
  const handleEventDrop = useCallback((info: EventDropArg) => {
    const idx = parseInt(info.event.id);
    const newDate = info.event.start;
    if (!newDate || isNaN(idx)) {
      info.revert();
      return;
    }

    const newDateStr = formatISODate(newDate);
    const newTime = `${String(newDate.getHours()).padStart(2, '0')}:${String(newDate.getMinutes()).padStart(2, '0')}`;
    const newDow = WEEKDAYS[newDate.getDay()]!;

    setAppointments((prev) => {
      const updated = [...prev];
      updated[idx] = {
        ...updated[idx]!,
        appointment_date: newDateStr,
        appointment_time: newTime,
        day_of_week: newDow,
      };
      // Re-sort by date then time
      updated.sort((a, b) => {
        const dateCmp = a.appointment_date.localeCompare(b.appointment_date);
        if (dateCmp !== 0) return dateCmp;
        return a.appointment_time.localeCompare(b.appointment_time);
      });
      // Re-assign sort_order
      return updated.map((appt, i) => ({ ...appt, sort_order: i }));
    });
    setChangeCount((c) => c + 1);
    setSelectedEvent(null);
  }, []);

  // Handle event click — toggle delete popover
  const handleEventClick = useCallback((info: EventClickArg) => {
    const id = info.event.id;
    setSelectedEvent((prev) => (prev?.id === id ? null : { id, el: info.el }));
  }, []);

  // Delete an appointment
  const handleDeleteAppointment = useCallback(() => {
    if (!selectedEvent) return;
    const idx = parseInt(selectedEvent.id);
    setAppointments((prev) => {
      const updated = prev.filter((_, i) => i !== idx);
      return updated.map((appt, i) => ({ ...appt, sort_order: i }));
    });
    setChangeCount((c) => c + 1);
    setSelectedEvent(null);
  }, [selectedEvent]);

  // Reset to original
  const handleReset = useCallback(() => {
    setAppointments(initialAppointments);
    setChangeCount(0);
    setSelectedEvent(null);
  }, [initialAppointments]);

  // Save
  const handleSave = useCallback(() => {
    onSave(appointments);
  }, [appointments, onSave]);

  return (
    <div style={s.overlay}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <h2 style={s.title}>
              {patientAlias || patientInitials}
            </h2>
            <span style={s.headerMeta}>
              {appointments.length} appointments · {sessionsPerWeek}x/wk · {durationWeeks} wks · {formatTime(appointmentTime)}
            </span>
          </div>
          <div style={s.headerRight}>
            {changeCount > 0 && (
              <span style={s.changeBadge}>{changeCount} change{changeCount !== 1 ? 's' : ''}</span>
            )}
          </div>
        </div>

        {/* Calendar */}
        <div style={s.calendarWrap}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek',
            }}
            events={events}
            initialDate={startDate}
            validRange={{ start: startDate, end: validEnd }}
            editable={true}
            eventDrop={handleEventDrop}
            eventClick={handleEventClick}
            height="auto"
            slotMinTime="06:00:00"
            slotMaxTime="20:00:00"
            allDaySlot={false}
            weekends={false}
            fixedWeekCount={false}
            navLinks={true}
            eventDisplay="block"
            dayMaxEvents={10}
            snapDuration="00:30:00"
            buttonText={{
              today: 'Today',
              month: 'Month',
              week: 'Week',
            }}
          />
        </div>

        {/* Delete popover */}
        {selectedEvent && (
          <div style={s.popover}>
            <button style={s.deleteBtn} onClick={handleDeleteAppointment}>
              Remove this appointment
            </button>
            <button style={s.popoverClose} onClick={() => setSelectedEvent(null)}>
              Cancel
            </button>
          </div>
        )}

        {/* Footer actions */}
        <div style={s.footer}>
          <button style={s.cancelBtn} onClick={onCancel}>Cancel</button>
          {changeCount > 0 && (
            <button style={s.resetBtn} onClick={handleReset}>Reset</button>
          )}
          <button style={s.saveBtn} onClick={handleSave}>
            Save &amp; Print
          </button>
        </div>
      </div>
    </div>
  );
}

function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--off-white)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
  },
  container: {
    maxWidth: '1100px',
    width: '100%',
    margin: '0 auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    flex: 1,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'var(--white)',
    padding: '1rem 1.5rem',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--gray-mid)',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--dark)',
  },
  headerMeta: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  changeBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    background: 'var(--orange-light)',
    color: 'var(--orange-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.8rem',
    fontWeight: 600,
  },
  calendarWrap: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem',
    border: '1px solid var(--gray-mid)',
    flex: 1,
  },
  popover: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
    zIndex: 300,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    minWidth: '240px',
    textAlign: 'center',
  },
  deleteBtn: {
    padding: '0.75rem 1rem',
    background: '#EF4444',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  popoverClose: {
    padding: '0.5rem 1rem',
    background: 'var(--gray-light)',
    color: 'var(--dark)',
    borderRadius: 'var(--radius)',
    fontWeight: 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    padding: '1rem 0',
  },
  cancelBtn: {
    padding: '0.75rem 1.5rem',
    background: 'var(--gray-light)',
    color: 'var(--dark)',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  resetBtn: {
    padding: '0.75rem 1.5rem',
    background: 'var(--orange-light)',
    color: 'var(--orange-mid)',
    border: '1px solid var(--orange-mid)',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '0.75rem 2rem',
    background: 'var(--green-dark)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
  },
};
