import { useState, useEffect, useCallback, useRef } from 'react';
import {
  type WizardResult,
  type StepOption,
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

export type { WizardResult };

interface ScheduleWizardProps {
  onComplete: (config: WizardResult) => void;
  onCancel: () => void;
}

const STEP_TITLES = ['Patient Initials', 'Days per Week', 'Duration', 'Time', 'Confirm'];

// ── Component ──

export function ScheduleWizard({ onComplete, onCancel }: ScheduleWizardProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animKey, setAnimKey] = useState(0);

  // Selections
  const [patientInitials, setPatientInitials] = useState('');
  const [patientAlias, setPatientAlias] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [frequencyKey, setFrequencyKey] = useState('');
  const [durationKey, setDurationKey] = useState('');
  const [durationMode, setDurationMode] = useState<'weeks' | 'months'>('weeks');
  const [timeKey, setTimeKey] = useState('');
  const [startDate] = useState(() => {
    const nextMon = getNextMonday();
    return toISODate(nextMon);
  });
  const [startDateLabel] = useState(() => {
    const nextMon = getNextMonday();
    return `Next Monday — ${formatShortDate(nextMon)}`;
  });

  // Refs
  const initialsRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived values
  const sessionsPerWeek = FREQUENCY_VALUES[frequencyKey] ?? 0;
  const durationList = durationMode === 'weeks' ? DURATION_WEEKS : DURATION_MONTHS;
  const durationEntry = durationList.find((d) => d.key === durationKey);
  const durationWeeks = durationEntry?.weeks ?? 0;
  const totalSessions = sessionsPerWeek * durationWeeks;
  const selectedTime = TIME_SLOTS.find((t) => t.key === timeKey);

  // ── Step navigation ──

  const goForward = useCallback((nextStep: number) => {
    setDirection('forward');
    setAnimKey((k) => k + 1);
    setStep(nextStep);
  }, []);

  const goBack = useCallback(() => {
    if (step <= 1) {
      onCancel();
      return;
    }
    setDirection('backward');
    setAnimKey((k) => k + 1);
    setStep((s) => s - 1);
  }, [step, onCancel]);

  // ── Action handlers ──

  const handleInitialsChange = useCallback((value: string) => {
    const cleaned = value
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 2)
      .toUpperCase();
    setPatientInitials(cleaned);
    if (cleaned.length === 2) {
      setPatientAlias(lookupAlias(cleaned));
    } else {
      setPatientAlias('');
    }
  }, []);

  const handleConfirm = useCallback(() => {
    const trimmedEmail = patientEmail.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Please enter a valid email or leave blank');
      return;
    }
    setEmailError('');
    onComplete({
      sessionsPerWeek,
      durationWeeks,
      startDate,
      patientInitials,
      patientAlias,
      appointmentTime: selectedTime?.time ?? '09:00',
      patientEmail: trimmedEmail || undefined,
    });
  }, [
    onComplete,
    sessionsPerWeek,
    durationWeeks,
    startDate,
    patientInitials,
    patientAlias,
    selectedTime,
    patientEmail,
  ]);

  const handleRestart = useCallback(() => {
    setStep(1);
    setDirection('forward');
    setAnimKey((k) => k + 1);
    setPatientInitials('');
    setPatientAlias('');
    setFrequencyKey('');
    setDurationKey('');
    setDurationMode('weeks');
    setTimeKey('');
  }, []);

  // ── Focus management ──

  useEffect(() => {
    if (step === 1 && initialsRef.current) {
      const t = setTimeout(() => initialsRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [step]);

  // ── Keyboard handler ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && !inInput) {
        e.preventDefault();
        goBack();
        return;
      }

      if (step === 1) {
        if (e.key === 'Enter' && patientInitials.length === 2) {
          e.preventDefault();
          goForward(2);
        }
      } else if (step === 2) {
        const match = FREQUENCIES.find((o) => o.key === e.key);
        if (match) {
          e.preventDefault();
          setFrequencyKey(match.key);
          goForward(3);
        }
      } else if (step === 3) {
        if (e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          setDurationMode('weeks');
          setDurationKey('');
        } else if (e.key === 'q' || e.key === 'Q') {
          e.preventDefault();
          setDurationMode('months');
          setDurationKey('');
        } else {
          const list = durationMode === 'weeks' ? DURATION_WEEKS : DURATION_MONTHS;
          const match = list.find((o) => o.key === e.key);
          if (match) {
            e.preventDefault();
            setDurationKey(match.key);
            goForward(4);
          }
        }
      } else if (step === 4) {
        const match = TIME_SLOTS.find((o) => o.key === e.key);
        if (match) {
          e.preventDefault();
          setTimeKey(match.key);
          goForward(5);
        }
      } else if (step === 5) {
        if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleConfirm();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          handleRestart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    step,
    patientInitials,
    durationMode,
    goBack,
    goForward,
    onCancel,
    handleConfirm,
    handleRestart,
  ]);

  // ── Duration options with session count ──

  const durationOptions = durationList.map((d) => ({
    key: d.key,
    label: `${d.label}${sessionsPerWeek ? ` (${sessionsPerWeek * d.weeks} sessions)` : ''}`,
    description: DURATION_DESCRIPTIONS[d.weeks] || '',
  }));

  // ── Render helpers ──

  const renderProgressBar = () => (
    <div style={styles.progressContainer}>
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressFill, width: `${(step / 5) * 100}%` }} />
      </div>
      <span style={styles.progressLabel}>Step {step} of 5</span>
    </div>
  );

  const renderOptionButton = (option: StepOption, onSelect: () => void) => (
    <button
      key={option.key}
      style={styles.optionButton}
      onClick={onSelect}
      aria-label={`Press ${option.key}: ${option.label} — ${option.description}`}
    >
      <span style={styles.optionKey}>{option.key}</span>
      <div style={styles.optionText}>
        <span style={styles.optionLabel}>{option.label}</span>
        <span style={styles.optionDesc}>{option.description}</span>
      </div>
    </button>
  );

  const renderNav = () => (
    <div style={styles.navHints}>
      {step > 1 && (
        <button style={styles.navButton} onClick={goBack} aria-label="Go back">
          <span style={styles.navKey}>&#8592;</span> Back
        </button>
      )}
      <button style={styles.navButton} onClick={onCancel} aria-label="Cancel wizard">
        <span style={styles.navKey}>Esc</span> Cancel
      </button>
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      // ── Step 1: Patient Initials ──
      case 1:
        return (
          <div>
            <h3 style={styles.stepTitle}>Who is this for?</h3>
            <p style={styles.stepSubtitle}>Type 2 letters, then press Enter</p>
            <div style={styles.initialsWrap}>
              <input
                ref={initialsRef}
                type="text"
                value={patientInitials}
                onChange={(e) => handleInitialsChange(e.target.value)}
                style={styles.initialsInput}
                maxLength={2}
                placeholder="JB"
                autoComplete="off"
                aria-label="Patient initials, 2 letters"
              />
              {patientAlias && (
                <div style={styles.aliasReveal}>
                  <span style={styles.aliasIcon}>&#x1F3C6;</span>
                  <span style={styles.aliasName}>{patientAlias}</span>
                </div>
              )}
              {patientInitials.length === 2 && (
                <button
                  style={styles.continueBtn}
                  onClick={() => goForward(2)}
                  aria-label="Continue"
                >
                  Continue <span style={styles.navKey}>Enter</span>
                </button>
              )}
            </div>
          </div>
        );

      // ── Step 2: Frequency ──
      case 2:
        return (
          <div>
            <h3 style={styles.stepTitle}>How many days per week?</h3>
            <div style={styles.optionList}>
              {FREQUENCIES.map((opt) =>
                renderOptionButton(opt, () => {
                  setFrequencyKey(opt.key);
                  goForward(3);
                }),
              )}
            </div>
          </div>
        );

      // ── Step 3: Duration ──
      case 3:
        return (
          <div>
            <h3 style={styles.stepTitle}>How long?</h3>
            <div style={styles.toggleRow}>
              <button
                style={{
                  ...styles.toggleBtn,
                  ...(durationMode === 'months' ? styles.toggleActive : {}),
                }}
                onClick={() => {
                  setDurationMode('months');
                  setDurationKey('');
                }}
              >
                <span style={styles.toggleKey}>Q</span> Months
              </button>
              <button
                style={{
                  ...styles.toggleBtn,
                  ...(durationMode === 'weeks' ? styles.toggleActive : {}),
                }}
                onClick={() => {
                  setDurationMode('weeks');
                  setDurationKey('');
                }}
              >
                <span style={styles.toggleKey}>W</span> Weeks
              </button>
            </div>
            <div style={styles.optionList}>
              {durationOptions.map((opt, idx) =>
                renderOptionButton(opt, () => {
                  setDurationKey(durationList[idx]!.key);
                  goForward(4);
                }),
              )}
            </div>
          </div>
        );

      // ── Step 4: Time ──
      case 4:
        return (
          <div>
            <h3 style={styles.stepTitle}>What time?</h3>
            <p style={styles.stepSubtitle}>
              Applies to all appointments. You can adjust individual times after.
            </p>
            <div style={styles.optionList}>
              {TIME_SLOTS.map((opt) =>
                renderOptionButton({ key: opt.key, label: opt.label, description: '' }, () => {
                  setTimeKey(opt.key);
                  goForward(5);
                }),
              )}
            </div>
          </div>
        );

      // ── Step 5: Confirm ──
      case 5:
        return (
          <div>
            <h3 style={styles.stepTitle}>Ready to generate?</h3>
            <div style={styles.summaryCard}>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Patient</span>
                <span style={styles.summaryValue}>
                  {patientInitials} &mdash; {patientAlias}
                </span>
              </div>
              <div style={styles.summaryDivider} />
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Frequency</span>
                <span style={styles.summaryValue}>{sessionsPerWeek}x per week</span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Duration</span>
                <span style={styles.summaryValue}>
                  {durationWeeks} weeks ({totalSessions} sessions)
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Time</span>
                <span style={styles.summaryValue}>
                  {selectedTime ? formatTime(selectedTime.time) : '9:00 AM'}
                </span>
              </div>
              <div style={styles.summaryRow}>
                <span style={styles.summaryLabel}>Start Date</span>
                <span style={styles.summaryValue}>{startDateLabel}</span>
              </div>
            </div>
            <div style={styles.emailBlock}>
              <label htmlFor="wizard-patient-email" style={styles.emailLabel}>
                Patient email <span style={styles.emailOptional}>(optional)</span>
              </label>
              <input
                id="wizard-patient-email"
                type="email"
                value={patientEmail}
                onChange={(e) => {
                  setPatientEmail(e.target.value);
                  setEmailError('');
                }}
                placeholder="patient@example.com"
                autoComplete="off"
                style={styles.emailInput}
                aria-describedby={
                  emailError ? 'wizard-patient-email-err' : 'wizard-patient-email-help'
                }
                aria-invalid={emailError ? true : undefined}
              />
              <p id="wizard-patient-email-help" style={styles.emailHelp}>
                Add to send 24h + 1h appointment reminders. Leave blank to skip. Stored encrypted;
                patient can unsubscribe with one click.
              </p>
              {emailError && (
                <p id="wizard-patient-email-err" style={styles.emailErr} role="alert">
                  {emailError}
                </p>
              )}
            </div>
            <div style={styles.confirmButtons}>
              <button style={styles.confirmYes} onClick={handleConfirm} aria-label="Yes, generate">
                <span style={styles.confirmKey}>Y</span> Yes &mdash; Generate
              </button>
              <button style={styles.confirmNo} onClick={handleRestart} aria-label="No, start over">
                <span style={styles.confirmKey}>N</span> No &mdash; Start Over
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Schedule Wizard — Step ${step}: ${STEP_TITLES[step - 1]}`}
    >
      <div ref={containerRef} style={styles.wizard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span style={styles.headerTitle}>Schedule Wizard</span>
          <button style={styles.closeBtn} onClick={onCancel} aria-label="Close wizard">
            &#x2715;
          </button>
        </div>
        {renderProgressBar()}
        <div style={styles.stepLabel}>
          <span style={styles.stepNumber}>{step}</span>
          <span style={styles.stepName}>{STEP_TITLES[step - 1]}</span>
        </div>
        <div
          key={animKey}
          style={{
            ...styles.stepContent,
            animation: `${direction === 'forward' ? 'wizardSlideIn' : 'wizardSlideBack'} 0.2s ease-out`,
          }}
        >
          {renderStepContent()}
        </div>
        {renderNav()}
        <style>{`
          @keyframes wizardSlideIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
          @keyframes wizardSlideBack { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
          @media (prefers-reduced-motion: reduce) {
            @keyframes wizardSlideIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes wizardSlideBack { from { opacity: 0; } to { opacity: 1; } }
          }
        `}</style>
      </div>
    </div>
  );
}

// ── Styles ──

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '1rem',
  },
  wizard: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1.5rem 0.75rem',
  },
  headerTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--dark)',
    letterSpacing: '-0.01em',
  },
  closeBtn: {
    background: 'none',
    fontSize: '1.1rem',
    color: 'var(--gray-text)',
    padding: '0.25rem',
    lineHeight: 1,
    borderRadius: '4px',
  },
  progressContainer: {
    padding: '0 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '0.25rem',
  },
  progressTrack: {
    flex: 1,
    height: '4px',
    background: 'var(--gray-light)',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--green-mid)',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  progressLabel: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    fontFamily: 'var(--font-mono)',
    whiteSpace: 'nowrap' as const,
  },
  stepLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.5rem 0.25rem',
  },
  stepNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    background: 'var(--green-dark)',
    color: 'white',
    borderRadius: '50%',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '0.75rem',
  },
  stepName: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--dark)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
  },
  stepContent: { padding: '0.5rem 1.5rem 1rem', minHeight: '200px' },
  stepTitle: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '1rem' },
  stepSubtitle: {
    fontSize: '0.875rem',
    color: 'var(--gray-text)',
    marginBottom: '1rem',
    marginTop: '-0.5rem',
  },
  optionList: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  optionButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    padding: '0.875rem 1rem',
    background: 'var(--off-white)',
    border: '2px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    textAlign: 'left' as const,
    transition: 'border-color 0.15s, background 0.15s, box-shadow 0.15s',
    cursor: 'pointer',
    width: '100%',
  },
  optionKey: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    minWidth: '32px',
    background: 'var(--green-dark)',
    color: 'white',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '0.875rem',
  },
  optionText: { display: 'flex', flexDirection: 'column' as const, gap: '0.125rem' },
  optionLabel: { fontWeight: 600, fontSize: '0.95rem', color: 'var(--dark)' },
  optionDesc: { fontSize: '0.8rem', color: 'var(--gray-text)' },
  toggleRow: { display: 'flex', gap: '0.5rem', marginBottom: '1rem' },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.5rem 1rem',
    background: 'var(--gray-light)',
    border: '2px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.875rem',
    color: 'var(--gray-text)',
    cursor: 'pointer',
    transition: 'all 0.15s',
    flex: 1,
    justifyContent: 'center',
  },
  toggleActive: {
    background: 'var(--green-light)',
    borderColor: 'var(--green-mid)',
    color: 'var(--green-dark)',
  },
  toggleKey: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '22px',
    height: '22px',
    background: 'rgba(0,0,0,0.08)',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '0.75rem',
  },
  initialsWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1rem',
  },
  initialsInput: {
    padding: '1rem',
    fontSize: '2.5rem',
    textAlign: 'center' as const,
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    letterSpacing: '0.5rem',
    border: '2px solid var(--green-mid)',
    borderRadius: 'var(--radius)',
    textTransform: 'uppercase' as const,
    width: '160px',
    color: 'var(--dark)',
    background: 'var(--off-white)',
  },
  aliasReveal: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1.25rem',
    background: 'var(--green-light)',
    borderRadius: 'var(--radius)',
    animation: 'wizardSlideIn 0.2s ease-out',
  },
  aliasIcon: { fontSize: '1.25rem' },
  aliasName: {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: 'var(--green-dark)',
    fontFamily: 'var(--font-body)',
  },
  continueBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1.25rem',
    background: 'var(--green-dark)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'background 0.15s',
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
  summaryCard: {
    background: 'var(--off-white)',
    border: '2px solid var(--green-light)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    marginBottom: '1.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.625rem',
  },
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
  },
  summaryLabel: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  },
  summaryValue: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--dark)',
    textAlign: 'right' as const,
  },
  summaryDivider: { height: '1px', background: 'var(--gray-mid)', margin: '0.125rem 0' },
  emailBlock: { marginBottom: '1rem', paddingTop: '0.5rem' },
  emailLabel: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--dark)',
    marginBottom: '0.375rem',
  },
  emailOptional: { fontSize: '0.75rem', color: 'var(--gray-text)', fontWeight: 400 },
  emailInput: {
    width: '100%',
    padding: '0.625rem 0.75rem',
    fontSize: '0.95rem',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    background: 'var(--white)',
    boxSizing: 'border-box' as const,
  },
  emailHelp: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    lineHeight: 1.45,
    marginTop: '0.375rem',
    marginBottom: 0,
  },
  emailErr: {
    fontSize: '0.8rem',
    color: 'var(--red-mid)',
    fontWeight: 500,
    marginTop: '0.375rem',
    marginBottom: 0,
  },
  confirmButtons: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  confirmYes: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.625rem',
    padding: '0.875rem 1rem',
    background: 'var(--green-dark)',
    color: 'white',
    borderRadius: 'var(--radius)',
    fontWeight: 700,
    fontSize: '1rem',
    transition: 'background 0.15s',
    cursor: 'pointer',
    width: '100%',
  },
  confirmNo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.625rem',
    padding: '0.75rem 1rem',
    background: 'var(--gray-light)',
    color: 'var(--dark)',
    borderRadius: 'var(--radius)',
    fontWeight: 600,
    fontSize: '0.9rem',
    transition: 'background 0.15s',
    cursor: 'pointer',
    width: '100%',
  },
  confirmKey: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '26px',
    height: '26px',
    background: 'rgba(255,255,255,0.2)',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '0.8rem',
  },
  navHints: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    padding: '0.75rem 1.5rem 1.25rem',
    borderTop: '1px solid var(--gray-light)',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    background: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.8rem',
    fontWeight: 500,
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    transition: 'color 0.15s',
    cursor: 'pointer',
  },
  navKey: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '22px',
    height: '20px',
    padding: '0 4px',
    background: 'var(--gray-light)',
    borderRadius: '3px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: 'var(--gray-text)',
  },
};
