import { useMemo, useState, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, EventClickArg } from '@fullcalendar/core';
import { formatTime } from '@ptowl/shared';
import type { Appointment } from '@ptowl/shared';
import { AppointmentDetailPopover } from './AppointmentDetailPopover.js';
import '../../styles/fullcalendar-theme.css';

interface PTCalendarProps {
  appointments: Appointment[];
  startDate: string;
  endDate: string;
  onToggleReminder?: (apptId: string, currentValue: number) => void;
}

function getAppointmentStatus(dateStr: string): 'completed' | 'today' | 'upcoming' {
  const today = new Date().toISOString().split('T')[0]!;
  if (dateStr < today) return 'completed';
  if (dateStr === today) return 'today';
  return 'upcoming';
}

const statusColors: Record<string, { bg: string; border: string; className: string }> = {
  completed: { bg: '#9CA3AF', border: '#6B7280', className: 'fc-event-completed' },
  today: { bg: '#22C55E', border: '#166534', className: 'fc-event-today-appt' },
  upcoming: { bg: '#FF7043', border: '#E64A19', className: 'fc-event-upcoming' },
};

export function PTCalendar({ appointments, startDate, endDate, onToggleReminder }: PTCalendarProps) {
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const events: EventInput[] = useMemo(() => {
    return appointments.map((appt) => {
      const status = getAppointmentStatus(appt.appointment_date);
      const colors = statusColors[status];
      return {
        id: appt.id,
        title: `${formatTime(appt.appointment_time)}${appt.provider_name ? ' · ' + appt.provider_name : ''}`,
        start: `${appt.appointment_date}T${appt.appointment_time}`,
        allDay: false,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        classNames: [colors.className],
        extendedProps: { appointment: appt, status },
      };
    });
  }, [appointments]);

  // Add one day to end date so FullCalendar includes the last day in its range
  const validEnd = useMemo(() => {
    const d = new Date(endDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [endDate]);

  const handleEventClick = useCallback((info: EventClickArg) => {
    const appt = info.event.extendedProps.appointment as Appointment;
    const rect = info.el.getBoundingClientRect();
    setSelectedAppt(appt);
    setPopoverPos({ top: rect.bottom + 8, left: rect.left });
  }, []);

  const handleClosePopover = useCallback(() => {
    setSelectedAppt(null);
    setPopoverPos(null);
  }, []);

  return (
    <div style={s.wrapper}>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay',
        }}
        events={events}
        validRange={{ start: startDate, end: validEnd }}
        initialDate={startDate}
        eventClick={handleEventClick}
        height="auto"
        dayMaxEvents={4}
        eventDisplay="block"
        slotMinTime="06:00:00"
        slotMaxTime="20:00:00"
        allDaySlot={false}
        weekends={true}
        fixedWeekCount={false}
        navLinks={true}
        buttonText={{
          today: 'Today',
          month: 'Month',
          week: 'Week',
          day: 'Day',
        }}
      />

      {selectedAppt && popoverPos && (
        <AppointmentDetailPopover
          appointment={selectedAppt}
          position={popoverPos}
          onClose={handleClosePopover}
          onToggleReminder={onToggleReminder}
        />
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    maxWidth: '960px',
    margin: '1rem auto',
    padding: '0 1.5rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
  },
};
