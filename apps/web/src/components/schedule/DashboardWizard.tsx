import { useState, useRef, useEffect } from 'react';
import {
  type WizardResult,
  FREQUENCIES,
  FREQUENCY_VALUES,
  DURATION_WEEKS,
  DURATION_MONTHS,
  DURATION_DESCRIPTIONS,
  TIME_SLOTS,
  formatShortDate,
  toISODate,
  getNextMonday,
  lookupAlias,
} from './wizard-constants.js';
import { formatTime } from '@ptowl/shared';

interface DashboardWizardProps {
  onComplete: (config: WizardResult) => void;
}

export function DashboardWizard({ onComplete }: DashboardWizardProps) {
  const [step, setStep] = useState(1);
  const [animKey, setAnimKey] = useState(0);

  // Selections
  const [patientInitials, setPatientInitials] = useState('');
  const [patientAlias, setPatientAlias] = useState('');
  const [frequencyKey, setFrequencyKey] = useState('');
  const [durationKey, setDurationKey] = useState('');
  const [durationMode, setDurationMode] = useState<'weeks' | 'months'>('weeks');
  const [selectedTime, setSelectedTime] = useState('');

  const initialsRef1 = useRef<HTMLInputElement>(null);
  const initialsRef2 = useRef<HTMLInputElement>(null);

  // Derived
  const sessionsPerWeek = FREQUENCY_VALUES[frequencyKey] ?? 0;
  const durationList = durationMode === 'weeks' ? DURATION_WEEKS : DURATION_MONTHS;
  const durationEntry = durationList.find((d) => d.key === durationKey);
  const durationWeeks = durationEntry?.weeks ?? 0;
  const totalSessions = sessionsPerWeek * durationWeeks;
  const timeEntry = TIME_SLOTS.find((t) => t.key === selectedTime);
  const nextMon = getNextMonday();
  const startDate = toISODate(nextMon);
  const startDateLabel = `Next Monday, ${formatShortDate(nextMon)}`;

  // Focus first letter input on mount/step 1
  useEffect(() => {
    if (step === 1 && initialsRef1.current) {
      const t = setTimeout(() => initialsRef1.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [step]);

  const goTo = (nextStep: number) => {
    setAnimKey((k) => k + 1);
    setStep(nextStep);
  };

  const handleLetterChange = (pos: 0 | 1, value: string) => {
    const letter = value.replace(/[^a-zA-Z]/g, '').slice(0, 1).toUpperCase();
    const updated = pos === 0
      ? letter + patientInitials.slice(1)
      : patientInitials.slice(0, 1) + letter;

    setPatientInitials(updated);

    if (pos === 0 && letter) {
      initialsRef2.current?.focus();
    }

    if (updated.length === 2 && updated[0] && updated[1]) {
      setPatientAlias(lookupAlias(updated));
    } else {
      setPatientAlias('');
    }
  };

  const handleConfirm = () => {
    onComplete({
      sessionsPerWeek,
      durationWeeks,
      startDate,
      patientInitials,
      patientAlias,
      appointmentTime: timeEntry?.time ?? '09:00',
    });
  };

  const handleRestart = () => {
    setStep(1);
    setAnimKey((k) => k + 1);
    setPatientInitials('');
    setPatientAlias('');
    setFrequencyKey('');
    setDurationKey('');
    setDurationMode('weeks');
    setSelectedTime('');
  };

  // Step indicators
  const stepLabels = ['Initials', 'Frequency', 'Duration', 'Time', 'Review'];

  const renderStepIndicators = () => (
    <div style={styles.stepIndicators}>
      {stepLabels.map((label, idx) => {
        const num = idx + 1;
        const isActive = num === step;
        const isDone = num < step;
        return (
          <div key={label} style={styles.stepIndicatorItem}>
            <div
              style={{
                ...styles.stepDot,
                ...(isActive ? styles.stepDotActive : {}),
                ...(isDone ? styles.stepDotDone : {}),
              }}
            >
              {isDone ? '\u2713' : num}
            </div>
            <span
              style={{
                ...styles.stepIndicatorLabel,
                ...(isActive ? { color: 'var(--green-dark)', fontWeight: 600 } : {}),
              }}
            >
              {label}
            </span>
            {idx < stepLabels.length - 1 && <div style={styles.stepLine} />}
          </div>
        );
      })}
    </div>
  );

  const renderStep = () => {
    switch (step) {
      // ── Step 1: Initials ──
      case 1:
        return (
          <div style={styles.stepBody}>
            <h3 style={styles.stepTitle}>Who is this schedule for?</h3>
            <p style={styles.stepSubtitle}>Enter 2-letter patient initials</p>
            <div style={styles.letterBoxes}>
              <input
                ref={initialsRef1}
                type="text"
                value={patientInitials[0] || ''}
                onChange={(e) => handleLetterChange(0, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !patientInitials[0]) return;
                }}
                style={styles.letterInput}
                maxLength={1}
                autoComplete="off"
                aria-label="First initial"
              />
              <input
                ref={initialsRef2}
                type="text"
                value={patientInitials[1] || ''}
                onChange={(e) => handleLetterChange(1, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !patientInitials[1]) {
                    initialsRef1.current?.focus();
                  }
                }}
                style={styles.letterInput}
                maxLength={1}
                autoComplete="off"
                aria-label="Second initial"
              />
            </div>
            {patientAlias && (
              <div style={styles.aliasReveal}>
                <span style={styles.aliasIcon}>&#x1F3C6;</span>
                <span style={styles.aliasName}>{patientAlias}</span>
              </div>
            )}
            {patientInitials.length === 2 && patientInitials[0] && patientInitials[1] && (
              <button style={styles.continueBtn} onClick={() => goTo(2)}>
                Continue
              </button>
            )}
          </div>
        );

      // ── Step 2: Frequency ──
      case 2:
        return (
          <div style={styles.stepBody}>
            <h3 style={styles.stepTitle}>How many days per week?</h3>
            <div style={styles.freqGrid}>
              {FREQUENCIES.map((opt) => (
                <button
                  key={opt.key}
                  style={styles.freqCard}
                  onClick={() => {
                    setFrequencyKey(opt.key);
                    goTo(3);
                  }}
                >
                  <span style={styles.freqNumber}>{opt.key}</span>
                  <span style={styles.freqDesc}>{opt.description}</span>
                </button>
              ))}
            </div>
            <button style={styles.backLink} onClick={() => goTo(1)}>
              &larr; Back
            </button>
          </div>
        );

      // ── Step 3: Duration ──
      case 3:
        return (
          <div style={styles.stepBody}>
            <h3 style={styles.stepTitle}>How long?</h3>
            <div style={styles.toggleRow}>
              <button
                style={{
                  ...styles.toggleBtn,
                  ...(durationMode === 'months' ? styles.toggleActive : {}),
                }}
                onClick={() => { setDurationMode('months'); setDurationKey(''); }}
              >
                Months
              </button>
              <button
                style={{
                  ...styles.toggleBtn,
                  ...(durationMode === 'weeks' ? styles.toggleActive : {}),
                }}
                onClick={() => { setDurationMode('weeks'); setDurationKey(''); }}
              >
                Weeks
              </button>
            </div>
            <div style={styles.durationGrid}>
              {durationList.map((opt) => (
                <button
                  key={opt.key}
                  style={styles.durationCard}
                  onClick={() => {
                    setDurationKey(opt.key);
                    goTo(4);
                  }}
                >
                  <span style={styles.durationValue}>
                    {durationMode === 'weeks' ? opt.weeks : opt.label.split(' ')[0]}
                  </span>
                  <span style={styles.durationUnit}>
                    {durationMode === 'weeks' ? 'weeks' : opt.label.split(' ')[0] === '1' ? 'month' : 'months'}
                  </span>
                  <span style={styles.durationSessions}>
                    {sessionsPerWeek * opt.weeks} sessions
                  </span>
                  {DURATION_DESCRIPTIONS[opt.weeks] && (
                    <span style={styles.durationHint}>{DURATION_DESCRIPTIONS[opt.weeks]}</span>
                  )}
                </button>
              ))}
            </div>
            <button style={styles.backLink} onClick={() => goTo(2)}>
              &larr; Back
            </button>
          </div>
        );

      // ── Step 4: Time ──
      case 4:
        return (
          <div style={styles.stepBody}>
            <h3 style={styles.stepTitle}>What time?</h3>
            <p style={styles.stepSubtitle}>Select a default appointment time</p>
            <div style={styles.timeGrid}>
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot.key}
                  style={styles.timeCard}
                  onClick={() => {
                    setSelectedTime(slot.key);
                    goTo(5);
                  }}
                >
                  <span style={styles.timeLabel}>{slot.label}</span>
                </button>
              ))}
            </div>
            <button style={styles.backLink} onClick={() => goTo(3)}>
              &larr; Back
            </button>
          </div>
        );

      // ── Step 5: Review ──
      case 5:
        return (
          <div style={styles.stepBody}>
            <h3 style={styles.stepTitle}>Review &amp; Generate</h3>
            <div style={styles.reviewCard}>
              <div style={styles.reviewRow}>
                <span style={styles.reviewLabel}>Patient</span>
                <span style={styles.reviewValue}>
                  {patientInitials} &mdash; {patientAlias}
                </span>
              </div>
              <div style={styles.reviewDivider} />
              <div style={styles.reviewRow}>
                <span style={styles.reviewLabel}>Frequency</span>
                <span style={styles.reviewValue}>{sessionsPerWeek}x per week</span>
              </div>
              <div style={styles.reviewRow}>
                <span style={styles.reviewLabel}>Duration</span>
                <span style={styles.reviewValue}>
                  {durationWeeks} weeks ({totalSessions} sessions)
                </span>
              </div>
              <div style={styles.reviewRow}>
                <span style={styles.reviewLabel}>Time</span>
                <span style={styles.reviewValue}>
                  {timeEntry ? formatTime(timeEntry.time) : '9:00 AM'}
                </span>
              </div>
              <div style={styles.reviewRow}>
                <span style={styles.reviewLabel}>Starts</span>
                <span style={styles.reviewValue}>{startDateLabel}</span>
              </div>
            </div>
            <div style={styles.reviewActions}>
              <button style={styles.generateBtn} onClick={handleConfirm}>
                Generate &amp; Print
              </button>
              <button style={styles.startOverBtn} onClick={handleRestart}>
                Start Over
              </button>
            </div>
            <button style={styles.backLink} onClick={() => goTo(4)}>
              &larr; Back
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h2 style={styles.cardTitle}>New Schedule</h2>
        </div>
        {renderStepIndicators()}
        <div
          key={animKey}
          style={{
            animation: 'dashWizFadeIn 0.2s ease-out',
          }}
        >
          {renderStep()}
        </div>
        <style>{`
          @keyframes dashWizFadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes dashWizFadeIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
          }
        `}</style>
      </div>
    </div>
  );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '2rem',
  },
  card: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    border: '2px solid var(--green-light)',
    width: '100%',
    maxWidth: '600px',
    overflow: 'hidden',
  },
  cardHeader: {
    padding: '1.25rem 1.5rem 0.75rem',
    borderBottom: '1px solid var(--gray-light)',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--dark)',
  },

  // Step indicators
  stepIndicators: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem 1.5rem 0.5rem',
    gap: '0',
  },
  stepIndicatorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  stepDot: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: 'var(--gray-light)',
    color: 'var(--gray-text)',
    fontSize: '0.75rem',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  stepDotActive: {
    background: 'var(--green-dark)',
    color: 'white',
  },
  stepDotDone: {
    background: 'var(--green-mid)',
    color: 'white',
  },
  stepIndicatorLabel: {
    fontSize: '0.7rem',
    color: 'var(--gray-text)',
    whiteSpace: 'nowrap' as const,
  },
  stepLine: {
    width: '24px',
    height: '2px',
    background: 'var(--gray-mid)',
    margin: '0 0.25rem',
    flexShrink: 0,
  },

  // Step body
  stepBody: {
    padding: '1.25rem 1.5rem 1.5rem',
  },
  stepTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.5rem',
  },
  stepSubtitle: {
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
    marginBottom: '1.25rem',
  },

  // Initials
  letterBoxes: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    marginBottom: '1rem',
  },
  letterInput: {
    width: '72px',
    height: '80px',
    fontSize: '2.5rem',
    textAlign: 'center' as const,
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    border: '3px solid var(--green-mid)',
    borderRadius: 'var(--radius-lg)',
    color: 'var(--dark)',
    background: 'var(--off-white)',
    outline: 'none',
  },
  aliasReveal: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1rem',
    background: 'var(--green-light)',
    borderRadius: 'var(--radius)',
    marginBottom: '1rem',
    animation: 'dashWizFadeIn 0.2s ease-out',
  },
  aliasIcon: {
    fontSize: '1.1rem',
  },
  aliasName: {
    fontWeight: 700,
    fontSize: '1rem',
    color: 'var(--green-dark)',
  },
  continueBtn: {
    display: 'block',
    width: '100%',
    padding: '0.75rem',
    background: 'var(--green-dark)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background 0.15s',
    textAlign: 'center' as const,
  },

  // Frequency
  freqGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.625rem',
    marginBottom: '1rem',
  },
  freqCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.375rem',
    padding: '1rem 0.5rem',
    background: 'var(--off-white)',
    border: '2px solid var(--gray-mid)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  freqNumber: {
    fontSize: '1.75rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--green-dark)',
    lineHeight: 1,
  },
  freqDesc: {
    fontSize: '0.65rem',
    color: 'var(--gray-text)',
    textAlign: 'center' as const,
    lineHeight: 1.2,
  },

  // Duration toggle
  toggleRow: {
    display: 'flex',
    gap: '0',
    marginBottom: '1rem',
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    border: '2px solid var(--gray-mid)',
  },
  toggleBtn: {
    flex: 1,
    padding: '0.625rem 1rem',
    background: 'var(--off-white)',
    border: 'none',
    fontWeight: 600,
    fontSize: '0.9rem',
    color: 'var(--gray-text)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'center' as const,
  },
  toggleActive: {
    background: 'var(--green-dark)',
    color: 'white',
  },

  // Duration grid
  durationGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: '0.625rem',
    marginBottom: '1rem',
  },
  durationCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.125rem',
    padding: '1rem 0.5rem',
    background: 'var(--off-white)',
    border: '2px solid var(--gray-mid)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  durationValue: {
    fontSize: '1.5rem',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
    color: 'var(--green-dark)',
    lineHeight: 1,
  },
  durationUnit: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--dark)',
  },
  durationSessions: {
    fontSize: '0.7rem',
    color: 'var(--gray-text)',
    marginTop: '0.25rem',
  },
  durationHint: {
    fontSize: '0.6rem',
    color: 'var(--gray-text)',
    fontStyle: 'italic' as const,
  },

  // Time
  timeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '0.625rem',
    marginBottom: '1rem',
  },
  timeCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.875rem 0.5rem',
    background: 'var(--off-white)',
    border: '2px solid var(--gray-mid)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  timeLabel: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--green-dark)',
  },

  // Review
  reviewCard: {
    background: 'var(--off-white)',
    border: '2px solid var(--green-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    marginBottom: '1.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.625rem',
  },
  reviewRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
  },
  reviewLabel: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  },
  reviewValue: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--dark)',
    textAlign: 'right' as const,
  },
  reviewDivider: {
    height: '1px',
    background: 'var(--gray-mid)',
    margin: '0.125rem 0',
  },
  reviewActions: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '0.75rem',
  },
  generateBtn: {
    flex: 2,
    padding: '0.875rem 1rem',
    background: 'var(--green-dark)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontWeight: 700,
    fontSize: '1rem',
    cursor: 'pointer',
    transition: 'background 0.15s',
    textAlign: 'center' as const,
  },
  startOverBtn: {
    flex: 1,
    padding: '0.875rem 1rem',
    background: 'var(--gray-light)',
    color: 'var(--dark)',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'background 0.15s',
    textAlign: 'center' as const,
  },
  backLink: {
    display: 'inline-block',
    background: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.825rem',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '0.25rem 0',
    marginTop: '0.25rem',
  },
};
