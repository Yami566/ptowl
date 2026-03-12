import { useState, useEffect, useCallback, useRef } from 'react';
import { SPORTS_ALIASES } from '@ptowl/shared';

// ── Types ──

export interface WizardResult {
  bodyRegion: string;
  sessionsPerWeek: number;
  durationWeeks: number;
  startDate: string;
  patientInitials: string;
  patientAlias: string;
}

interface ScheduleWizardProps {
  onComplete: (config: WizardResult) => void;
  onCancel: () => void;
}

// ── Step data ──

interface StepOption {
  key: string;       // the keypress trigger ("1", "2", etc.)
  label: string;
  description: string;
}

const BODY_REGIONS: StepOption[] = [
  { key: '1', label: 'Lower Extremity', description: 'Knee, hip, ankle, foot' },
  { key: '2', label: 'Upper Extremity', description: 'Shoulder, elbow, wrist, hand' },
  { key: '3', label: 'Spine / Back', description: 'Cervical, thoracic, lumbar' },
  { key: '4', label: 'Neurological / Balance', description: 'Stroke recovery, fall prevention' },
  { key: '5', label: 'Post-Surgical', description: 'Any post-op rehabilitation' },
];

const FREQUENCIES: StepOption[] = [
  { key: '1', label: '2 times per week', description: 'Standard maintenance' },
  { key: '2', label: '3 times per week', description: 'Aggressive rehab / post-op' },
  { key: '3', label: 'Daily (5x/week)', description: 'Acute / inpatient' },
];

const FREQUENCY_VALUES: Record<string, number> = {
  '1': 2,
  '2': 3,
  '3': 5,
};

const DURATIONS: { key: string; weeks: number; label: string }[] = [
  { key: '1', weeks: 2, label: '2 weeks' },
  { key: '2', weeks: 4, label: '4 weeks' },
  { key: '3', weeks: 6, label: '6 weeks' },
  { key: '4', weeks: 8, label: '8 weeks' },
];

const DURATION_DESCRIPTIONS: Record<number, string> = {
  2: 'Short-term / evaluation',
  4: 'Standard course',
  6: 'Extended recovery',
  8: 'Post-surgical / complex',
};

const STEP_TITLES = [
  'Body Region',
  'Frequency',
  'Duration',
  'Start Date',
  'Patient Initials',
  'Confirm',
];

// ── Helpers ──

function formatShortDate(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getNextMonday(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const daysUntilMon = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
  const next = new Date(now);
  next.setDate(now.getDate() + daysUntilMon);
  return next;
}

function lookupAlias(initials: string): string {
  const key = initials.toUpperCase();
  const aliases = SPORTS_ALIASES[key];
  if (!aliases || aliases.length === 0) {
    return `${key[0]}. ${key[1]}player`;
  }
  // Pick first alias for client-side preview (server uses hash-based selection)
  return aliases[0]!;
}

// ── Component ──

export function ScheduleWizard({ onComplete, onCancel }: ScheduleWizardProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [animKey, setAnimKey] = useState(0);

  // Selections
  const [bodyRegion, setBodyRegion] = useState('');
  const [frequencyKey, setFrequencyKey] = useState('');
  const [durationKey, setDurationKey] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startDateLabel, setStartDateLabel] = useState('');
  const [patientInitials, setPatientInitials] = useState('');
  const [patientAlias, setPatientAlias] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Refs
  const initialsRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derived values
  const sessionsPerWeek = FREQUENCY_VALUES[frequencyKey] ?? 0;
  const durationEntry = DURATIONS.find((d) => d.key === durationKey);
  const durationWeeks = durationEntry?.weeks ?? 0;
  const totalSessions = sessionsPerWeek * durationWeeks;

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
    if (step === 4) {
      setShowDatePicker(false);
    }
    setStep((s) => s - 1);
  }, [step, onCancel]);

  // ── Action handlers (defined before the keyboard effect) ──

  const handleStartDateSelect = useCallback((key: string) => {
    const today = new Date();
    if (key === '1') {
      setStartDate(toISODate(today));
      setStartDateLabel(`Today -- ${formatShortDate(today)}`);
      goForward(5);
    } else if (key === '2') {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      setStartDate(toISODate(tomorrow));
      setStartDateLabel(`Tomorrow -- ${formatShortDate(tomorrow)}`);
      goForward(5);
    } else if (key === '3') {
      const nextMon = getNextMonday();
      setStartDate(toISODate(nextMon));
      setStartDateLabel(`Next Monday -- ${formatShortDate(nextMon)}`);
      goForward(5);
    } else if (key === '4') {
      setShowDatePicker(true);
    }
  }, [goForward]);

  const handleCustomDateConfirm = useCallback((dateValue: string) => {
    if (!dateValue) return;
    const parsed = new Date(dateValue + 'T00:00:00');
    setStartDate(dateValue);
    setStartDateLabel(formatShortDate(parsed));
    setShowDatePicker(false);
    goForward(5);
  }, [goForward]);

  const handleInitialsChange = useCallback((value: string) => {
    const cleaned = value.replace(/[^a-zA-Z]/g, '').slice(0, 2).toUpperCase();
    setPatientInitials(cleaned);
    if (cleaned.length === 2) {
      setPatientAlias(lookupAlias(cleaned));
    } else {
      setPatientAlias('');
    }
  }, []);

  const handleConfirm = useCallback(() => {
    onComplete({
      bodyRegion,
      sessionsPerWeek,
      durationWeeks,
      startDate,
      patientInitials,
      patientAlias,
    });
  }, [onComplete, bodyRegion, sessionsPerWeek, durationWeeks, startDate, patientInitials, patientAlias]);

  const handleRestart = useCallback(() => {
    setStep(1);
    setDirection('forward');
    setAnimKey((k) => k + 1);
    setBodyRegion('');
    setFrequencyKey('');
    setDurationKey('');
    setStartDate('');
    setStartDateLabel('');
    setPatientInitials('');
    setPatientAlias('');
    setShowDatePicker(false);
  }, []);

  // ── Focus management ──

  useEffect(() => {
    if (step === 5 && initialsRef.current) {
      const t = setTimeout(() => initialsRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    if (showDatePicker && dateRef.current) {
      const t = setTimeout(() => dateRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [showDatePicker]);

  // ── Keyboard handler ──

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Always allow Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }

      // Allow Backspace/ArrowLeft to go back (unless in an input)
      const target = e.target as HTMLElement;
      const inInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      if ((e.key === 'Backspace' || e.key === 'ArrowLeft') && !inInput) {
        e.preventDefault();
        goBack();
        return;
      }

      // Step-specific handling
      if (step === 1) {
        const match = BODY_REGIONS.find((o) => o.key === e.key);
        if (match) {
          e.preventDefault();
          setBodyRegion(match.label);
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
        const match = DURATIONS.find((o) => o.key === e.key);
        if (match) {
          e.preventDefault();
          setDurationKey(match.key);
          goForward(4);
        }
      } else if (step === 4 && !showDatePicker) {
        if (e.key >= '1' && e.key <= '4') {
          e.preventDefault();
          handleStartDateSelect(e.key);
        }
      } else if (step === 5) {
        if (e.key === 'Enter' && patientInitials.length === 2) {
          e.preventDefault();
          goForward(6);
        }
      } else if (step === 6) {
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
  }, [step, showDatePicker, patientInitials, goBack, goForward, onCancel, handleStartDateSelect, handleConfirm, handleRestart]);

  // ── Start date options (computed fresh each render) ──

  const startDateOptions = (() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextMon = getNextMonday();
    return [
      { key: '1', label: 'Today', description: formatShortDate(today) },
      { key: '2', label: 'Tomorrow', description: formatShortDate(tomorrow) },
      { key: '3', label: 'Next Monday', description: formatShortDate(nextMon) },
      { key: '4', label: 'Pick a date...', description: 'Choose a custom start' },
    ];
  })();

  // ── Duration options with session count ──

  const durationOptions = DURATIONS.map((d) => ({
    key: d.key,
    label: `${d.label} (${sessionsPerWeek * d.weeks} sessions)`,
    description: DURATION_DESCRIPTIONS[d.weeks] || '',
  }));

  // ── Render helpers ──

  const renderProgressBar = () => (
    <div style={styles.progressContainer}>
      <div style={styles.progressTrack}>
        <div
          style={{
            ...styles.progressFill,
            width: `${(step / 6) * 100}%`,
          }}
        />
      </div>
      <span style={styles.progressLabel}>Step {step} of 6</span>
    </div>
  );

  const renderOptionButton = (option: StepOption, onSelect: () => void) => (
    <button
      key={option.key}
      style={styles.optionButton}
      onClick={onSelect}
      aria-label={`Press ${option.key}: ${option.label} -- ${option.description}`}
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
      // ── Step 1: Body Region ──
      case 1:
        return (
          <div>
            <h3 style={styles.stepTitle}>What area needs treatment?</h3>
            <div style={styles.optionList}>
              {BODY_REGIONS.map((opt) =>
                renderOptionButton(opt, () => {
                  setBodyRegion(opt.label);
                  goForward(2);
                })
              )}
            </div>
          </div>
        );

      // ── Step 2: Frequency ──
      case 2:
        return (
          <div>
            <h3 style={styles.stepTitle}>How often?</h3>
            <div style={styles.optionList}>
              {FREQUENCIES.map((opt) =>
                renderOptionButton(opt, () => {
                  setFrequencyKey(opt.key);
                  goForward(3);
                })
              )}
            </div>
          </div>
        );

      // ── Step 3: Duration ──
      case 3:
        return (
          <div>
            <h3 style={styles.stepTitle}>How long?</h3>
            <div style={styles.optionList}>
              {durationOptions.map((opt, idx) =>
                renderOptionButton(opt, () => {
                  setDurationKey(DURATIONS[idx]!.key);
                  goForward(4);
                })
              )}
            </div>
          </div>
        );

      // ── Step 4: Start Date ──
      case 4:
        return (
          <div>
            <h3 style={styles.stepTitle}>When should it start?</h3>
            {!showDatePicker ? (
              <div style={styles.optionList}>
                {startDateOptions.map((opt) =>
                  renderOptionButton(opt, () => handleStartDateSelect(opt.key))
                )}
              </div>
            ) : (
              <div style={styles.datePickerWrap}>
                <label style={styles.dateLabel}>
                  Select a start date
                  <input
                    ref={dateRef}
                    type="date"
                    style={styles.dateInput}
                    min={toISODate(new Date())}
                    onChange={(e) => handleCustomDateConfirm(e.target.value)}
                    aria-label="Custom start date"
                  />
                </label>
                <button
                  style={styles.dateBackBtn}
                  onClick={() => setShowDatePicker(false)}
                >
                  Back to quick options
                </button>
              </div>
            )}
          </div>
        );

      // ── Step 5: Patient Initials ──
      case 5:
        return (
          <div>
            <h3 style={styles.stepTitle}>Patient initials</h3>
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
                  onClick={() => goForward(6)}
                  aria-label="Continue to confirmation"
                >
                  Continue <span style={styles.navKey}>Enter</span>
                </button>
              )}
            </div>
          </div>
        );

      // ── Step 6: Confirm ──
      case 6:
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
                <span style={styles.summaryLabel}>Body Region</span>
                <span style={styles.summaryValue}>{bodyRegion}</span>
              </div>
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
                <span style={styles.summaryLabel}>Start Date</span>
                <span style={styles.summaryValue}>{startDateLabel}</span>
              </div>
            </div>
            <div style={styles.confirmButtons}>
              <button
                style={styles.confirmYes}
                onClick={handleConfirm}
                aria-label="Yes, generate and print schedule"
              >
                <span style={styles.confirmKey}>Y</span>
                Yes &mdash; Generate &amp; Print
              </button>
              <button
                style={styles.confirmNo}
                onClick={handleRestart}
                aria-label="No, start over"
              >
                <span style={styles.confirmKey}>N</span>
                No &mdash; Start Over
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Main render ──

  return (
    <div
      style={styles.overlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={`Schedule Wizard - Step ${step}: ${STEP_TITLES[step - 1]}`}
    >
      <div
        ref={containerRef}
        style={styles.wizard}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>Schedule Wizard</span>
          <button
            style={styles.closeBtn}
            onClick={onCancel}
            aria-label="Close wizard"
          >
            &#x2715;
          </button>
        </div>

        {/* Progress */}
        {renderProgressBar()}

        {/* Step label */}
        <div style={styles.stepLabel}>
          <span style={styles.stepNumber}>{step}</span>
          <span style={styles.stepName}>{STEP_TITLES[step - 1]}</span>
        </div>

        {/* Content with transition */}
        <div
          key={animKey}
          style={{
            ...styles.stepContent,
            animation: `${direction === 'forward' ? 'wizardSlideIn' : 'wizardSlideBack'} 0.2s ease-out`,
          }}
        >
          {renderStepContent()}
        </div>

        {/* Navigation hints */}
        {renderNav()}

        {/* Inline keyframes */}
        <style>{`
          @keyframes wizardSlideIn {
            from { opacity: 0; transform: translateX(24px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @keyframes wizardSlideBack {
            from { opacity: 0; transform: translateX(-24px); }
            to   { opacity: 1; transform: translateX(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            @keyframes wizardSlideIn {
              from { opacity: 0; }
              to   { opacity: 1; }
            }
            @keyframes wizardSlideBack {
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

  // Progress
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

  // Step label
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

  // Step content
  stepContent: {
    padding: '0.5rem 1.5rem 1rem',
    minHeight: '200px',
  },
  stepTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '1rem',
  },
  stepSubtitle: {
    fontSize: '0.875rem',
    color: 'var(--gray-text)',
    marginBottom: '1rem',
    marginTop: '-0.5rem',
  },

  // Option list
  optionList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
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
  optionText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.125rem',
  },
  optionLabel: {
    fontWeight: 600,
    fontSize: '0.95rem',
    color: 'var(--dark)',
  },
  optionDesc: {
    fontSize: '0.8rem',
    color: 'var(--gray-text)',
  },

  // Date picker
  datePickerWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    alignItems: 'center',
  },
  dateLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--dark)',
    width: '100%',
    maxWidth: '280px',
  },
  dateInput: {
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '2px solid var(--green-mid)',
    borderRadius: 'var(--radius)',
    fontFamily: 'var(--font-body)',
    color: 'var(--dark)',
  },
  dateBackBtn: {
    background: 'none',
    color: 'var(--gray-text)',
    fontSize: '0.8rem',
    textDecoration: 'underline' as const,
    padding: '0.25rem',
  },

  // Initials
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
  aliasIcon: {
    fontSize: '1.25rem',
  },
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

  // Confirm / Summary
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
  summaryDivider: {
    height: '1px',
    background: 'var(--gray-mid)',
    margin: '0.125rem 0',
  },
  confirmButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
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

  // Navigation hints
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
