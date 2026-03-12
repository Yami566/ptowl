import { useMemo } from 'react';
import { getMonthsInRange, getDaysInMonth, getFirstDayOfMonth, formatTime } from '@ptowl/shared';
import type { Appointment, GeneratedAppointment } from '@ptowl/shared';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type CalendarAppointment = Appointment | GeneratedAppointment;

interface CalendarGridProps {
  appointments: CalendarAppointment[];
  startDate: string;
  endDate: string;
  compact?: boolean; // smaller sizing for modal use
}

function toISO(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export function CalendarGrid({ appointments, startDate, endDate, compact = false }: CalendarGridProps) {
  const today = toISO(new Date());

  // Pre-compute appointment lookup by date
  const apptMap = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const appt of appointments) {
      const date = appt.appointment_date;
      const list = map.get(date);
      if (list) {
        list.push(appt);
      } else {
        map.set(date, [appt]);
      }
    }
    return map;
  }, [appointments]);

  const months = useMemo(() => getMonthsInRange(startDate, endDate), [startDate, endDate]);

  return (
    <div style={compact ? s.containerCompact : s.container}>
      {months.map(({ year, month, label }) => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        return (
          <div key={`${year}-${month}`} style={s.monthBlock}>
            {/* Month header */}
            <h3 style={compact ? s.monthTitleCompact : s.monthTitle}>{label}</h3>

            {/* Day-of-week headers */}
            <div className="calendar-grid" style={s.grid}>
              {DAY_HEADERS.map((day) => (
                <div key={day} className="calendar-header-cell" style={s.dayHeader}>
                  {day}
                </div>
              ))}

              {/* Leading empty cells */}
              {Array.from({ length: firstDay }, (_, i) => (
                <div key={`empty-${i}`} style={s.emptyCell} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayAppts = apptMap.get(dateStr) || [];
                const isToday = dateStr === today;
                const hasAppts = dayAppts.length > 0;
                const isInRange = dateStr >= startDate && dateStr <= endDate;

                return (
                  <div
                    key={dateStr}
                    className="calendar-cell"
                    style={{
                      ...s.cell,
                      ...(compact ? s.cellCompact : {}),
                      ...(isToday ? s.todayCell : {}),
                      ...(hasAppts ? s.hasApptCell : {}),
                      ...(!isInRange ? s.outsideCell : {}),
                    }}
                  >
                    <div className="date-num" style={{ ...s.dateNum, ...(isToday ? s.todayNum : {}) }}>
                      {dayNum}
                    </div>
                    {dayAppts.map((appt, idx) => (
                      <div key={idx} className="appt-entry" style={s.apptEntry}>
                        {formatTime(appt.appointment_time)}
                        {'provider_name' in appt && appt.provider_name
                          ? ` · ${appt.provider_name}`
                          : ''}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '960px',
    margin: '1rem auto',
    padding: '0 1rem',
  },
  containerCompact: {
    width: '100%',
  },
  monthBlock: {
    marginBottom: '2rem',
  },
  monthTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
    textAlign: 'center',
    marginBottom: '0.5rem',
  },
  monthTitleCompact: {
    fontSize: '0.95rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
    textAlign: 'center',
    marginBottom: '0.375rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '1px',
    background: 'var(--gray-mid)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
  },
  dayHeader: {
    background: 'var(--orange-light)',
    color: 'var(--green-dark)',
    padding: '0.375rem',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: '0.75rem',
  },
  emptyCell: {
    background: 'var(--off-white)',
    minHeight: '80px',
  },
  cell: {
    background: 'var(--white)',
    minHeight: '80px',
    padding: '0.25rem',
    position: 'relative',
  },
  cellCompact: {
    minHeight: '60px',
    padding: '0.2rem',
  },
  todayCell: {
    border: '2px solid var(--orange-mid)',
  },
  hasApptCell: {
    background: 'var(--green-light)',
  },
  outsideCell: {
    background: 'var(--off-white)',
    opacity: 0.5,
  },
  dateNum: {
    fontWeight: 600,
    fontSize: '0.8rem',
    color: 'var(--dark)',
    marginBottom: '0.125rem',
  },
  todayNum: {
    color: 'var(--orange-mid)',
  },
  apptEntry: {
    fontSize: '0.7rem',
    color: 'var(--green-dark)',
    marginBottom: '0.125rem',
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};
