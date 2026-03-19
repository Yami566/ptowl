import { useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useLocalStorageState from 'use-local-storage-state';
import { useAuth } from '../contexts/AuthContext.js';

interface OnboardingState {
  dismissed: boolean;
  steps: {
    account: boolean;
    profile: boolean;
    template: boolean;
    schedule: boolean;
    print: boolean;
  };
}

const defaultState: OnboardingState = {
  dismissed: false,
  steps: { account: true, profile: false, template: false, schedule: false, print: false },
};

const stepConfig = [
  { key: 'account' as const, label: 'Create your account', done: true },
  { key: 'profile' as const, label: 'Set up your clinic info', link: '/profile' },
  { key: 'template' as const, label: 'Customize a template', link: '/customize/templates' },
  { key: 'schedule' as const, label: 'Generate your first schedule', action: true },
  { key: 'print' as const, label: 'Print a schedule', action: true },
];

export function OnboardingChecklist() {
  const { user } = useAuth();
  const [state, setState] = useLocalStorageState<OnboardingState>('ptowl-onboarding', {
    defaultValue: defaultState,
  });

  // Check if profile is already set up
  useEffect(() => {
    if (user?.clinic_name && !state.steps.profile) {
      setState((prev) => ({ ...prev, steps: { ...prev.steps, profile: true } }));
    }
  }, [user?.clinic_name, state.steps.profile, setState]);

  // Listen for onboarding events from other pages
  const handleEvent = useCallback((e: Event) => {
    const detail = (e as CustomEvent<string>).detail;
    if (detail && detail in state.steps) {
      setState((prev) => ({
        ...prev,
        steps: { ...prev.steps, [detail]: true },
      }));
    }
  }, [state.steps, setState]);

  useEffect(() => {
    window.addEventListener('ptowl-onboarding', handleEvent);
    return () => window.removeEventListener('ptowl-onboarding', handleEvent);
  }, [handleEvent]);

  const completedCount = Object.values(state.steps).filter(Boolean).length;
  const totalSteps = stepConfig.length;
  const allDone = completedCount === totalSteps;

  // Hide if dismissed or all done
  if (state.dismissed || allDone) return null;

  const progress = (completedCount / totalSteps) * 100;

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div>
          <h3 style={s.title}>Get Started with PTOWL</h3>
          <p style={s.subtitle}>{completedCount} of {totalSteps} steps complete</p>
        </div>
        <button
          style={s.dismissBtn}
          onClick={() => setState((prev) => ({ ...prev, dismissed: true }))}
          aria-label="Dismiss onboarding"
        >
          &times;
        </button>
      </div>

      <div style={s.progressTrack}>
        <div style={{ ...s.progressFill, width: `${progress}%` }} />
      </div>

      <div style={s.steps}>
        {stepConfig.map((step) => {
          const done = state.steps[step.key];
          return (
            <div key={step.key} style={{ ...s.step, opacity: done ? 0.6 : 1 }}>
              <span style={done ? s.checkDone : s.checkPending}>
                {done ? '\u2713' : '\u25CB'}
              </span>
              <span style={{ ...s.stepLabel, textDecoration: done ? 'line-through' : 'none' }}>
                {step.label}
              </span>
              {!done && step.link && (
                <Link to={step.link} style={s.stepLink}>Go &rarr;</Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  card: {
    background: 'var(--white)',
    border: '1px solid var(--green-mid)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.25rem',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 12px rgba(76, 175, 80, 0.1)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
  },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--dark)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    margin: '0.125rem 0 0',
  },
  dismissBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.25rem',
    color: 'var(--gray-text)',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  },
  progressTrack: {
    height: '4px',
    background: 'var(--gray-light)',
    borderRadius: '2px',
    marginBottom: '0.75rem',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'var(--green-mid)',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  steps: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.375rem',
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0',
  },
  checkDone: {
    color: 'var(--green-mid)',
    fontWeight: 700,
    fontSize: '0.875rem',
    width: '1.25rem',
    textAlign: 'center' as const,
  },
  checkPending: {
    color: 'var(--gray-mid)',
    fontSize: '0.875rem',
    width: '1.25rem',
    textAlign: 'center' as const,
  },
  stepLabel: {
    fontSize: '0.85rem',
    color: 'var(--dark)',
  },
  stepLink: {
    marginLeft: 'auto',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--green-mid)',
    textDecoration: 'none',
  },
};
