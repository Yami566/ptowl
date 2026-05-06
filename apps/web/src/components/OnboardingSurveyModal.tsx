import { useState } from 'react';
import { apiRequest } from '../api/client.js';
import { onboardingClinicTypes, onboardingFoundUsVia } from '@ptowl/shared';

type ClinicType = (typeof onboardingClinicTypes)[number];
type FoundUsVia = (typeof onboardingFoundUsVia)[number];

interface Props {
  onClose: () => void;
}

const CLINIC_OPTIONS: { value: ClinicType; label: string }[] = [
  { value: 'PT', label: 'Physical Therapy' },
  { value: 'OT', label: 'Occupational Therapy' },
  { value: 'SLP', label: 'Speech-Language' },
  { value: 'Chiro', label: 'Chiropractic' },
  { value: 'Mental', label: 'Mental Health' },
  { value: 'Dental', label: 'Dental Hygiene' },
  { value: 'Other', label: 'Other' },
];

const FOUND_US_OPTIONS: FoundUsVia[] = [
  'HN',
  'Reddit',
  'Word of mouth',
  'Search',
  'Social',
  'Other',
];

export function OnboardingSurveyModal({ onClose }: Props) {
  const [clinicType, setClinicType] = useState<ClinicType | ''>('');
  const [specialty, setSpecialty] = useState('');
  const [sessionsAvg, setSessionsAvg] = useState<number | ''>('');
  const [weekendHours, setWeekendHours] = useState(false);
  const [foundUsVia, setFoundUsVia] = useState<FoundUsVia | ''>('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(skipped: boolean) {
    setSubmitting(true);
    const payload = skipped
      ? { clinic_type: 'skipped' as const }
      : {
          clinic_type: (clinicType || 'Other') as ClinicType,
          specialty: specialty || undefined,
          sessions_per_week_avg: typeof sessionsAvg === 'number' ? sessionsAvg : undefined,
          weekend_hours: weekendHours,
          found_us_via: foundUsVia || undefined,
        };
    await apiRequest('/onboarding-survey', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    onClose();
  }

  return (
    <div style={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div style={styles.card}>
        <h2 id="onboarding-title" style={styles.title}>
          Welcome — a few quick questions.
        </h2>
        <p style={styles.subtitle}>
          Five short answers help us shape PTowl around how your clinic actually works. Skip
          anytime.
        </p>

        <label style={styles.label}>
          What kind of clinic?
          <div style={styles.radioGrid}>
            {CLINIC_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setClinicType(opt.value)}
                style={{
                  ...styles.radioBtn,
                  ...(clinicType === opt.value ? styles.radioBtnActive : {}),
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </label>

        <label style={styles.label}>
          Specialty (optional)
          <input
            type="text"
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value.slice(0, 100))}
            placeholder="e.g. post-op orthopedic"
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          Average sessions per week per patient
          <select
            value={sessionsAvg}
            onChange={(e) => setSessionsAvg(e.target.value ? Number(e.target.value) : '')}
            style={styles.input}
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{ ...styles.label, flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}
        >
          <input
            type="checkbox"
            checked={weekendHours}
            onChange={(e) => setWeekendHours(e.target.checked)}
          />
          <span>We see patients on weekends.</span>
        </label>

        <label style={styles.label}>
          How did you hear about PTowl?
          <div style={styles.radioGrid}>
            {FOUND_US_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFoundUsVia(opt)}
                style={{
                  ...styles.radioBtn,
                  ...(foundUsVia === opt ? styles.radioBtnActive : {}),
                }}
              >
                {opt}
              </button>
            ))}
          </div>
        </label>

        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={submitting}
            style={styles.skipBtn}
          >
            Skip for now
          </button>
          <button
            type="button"
            onClick={() => submit(false)}
            disabled={submitting || !clinicType}
            style={{
              ...styles.submitBtn,
              ...(submitting || !clinicType ? styles.submitBtnDisabled : {}),
            }}
          >
            {submitting ? 'Saving…' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
    overflowY: 'auto',
  },
  card: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.75rem',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--gray-text)',
    lineHeight: 1.5,
    marginBottom: '1.25rem',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--dark)',
  },
  input: {
    padding: '0.5rem 0.625rem',
    border: '1px solid var(--green-light)',
    borderRadius: 'var(--radius)',
    fontSize: '0.9rem',
    fontFamily: 'inherit',
    color: 'var(--dark)',
    background: 'var(--white)',
  },
  radioGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  radioBtn: {
    padding: '0.4rem 0.75rem',
    border: '1px solid var(--green-light)',
    borderRadius: 'var(--radius)',
    background: 'var(--white)',
    color: 'var(--dark)',
    fontSize: '0.825rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.12s, border-color 0.12s',
  },
  radioBtnActive: {
    background: 'var(--green-mid)',
    color: 'white',
    borderColor: 'var(--green-mid)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    marginTop: '1.25rem',
  },
  skipBtn: {
    padding: '0.6rem 1rem',
    background: 'transparent',
    color: 'var(--gray-text)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '0.6rem 1.25rem',
    background: 'var(--green-mid)',
    color: 'white',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtnDisabled: {
    opacity: 0.55,
    cursor: 'not-allowed',
  },
};
