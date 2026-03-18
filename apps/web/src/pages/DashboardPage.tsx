import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { apiRequest } from '../api/client.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { PageLayout } from '../components/layout/PageLayout.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';
import { SchedulePreviewOverlay } from '../components/schedule/SchedulePreviewOverlay.js';
import { ScheduleWizard } from '../components/schedule/ScheduleWizard.js';
import { DashboardWizard } from '../components/schedule/DashboardWizard.js';
import { ScheduleEditor } from '../components/schedule/ScheduleEditor.js';
import type { WizardResult } from '../components/schedule/wizard-constants.js';
import { useSchedulePreview } from '../hooks/useSchedulePreview.js';
import { generateScheduleWithRRule } from '@ptowl/shared';
import type { Template, Schedule, GeneratedAppointment } from '@ptowl/shared';

interface EditorData {
  initials: string;
  alias: string;
  appointments: GeneratedAppointment[];
  startDate: string;
  endDate: string;
  sessionsPerWeek: number;
  durationWeeks: number;
  appointmentTime: string;
}

export function DashboardPage() {
  usePageTitle('Dashboard');
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showInitialsModal, setShowInitialsModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [initials, setInitials] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [editorData, setEditorData] = useState<EditorData | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const modalInputRef = useRef<HTMLInputElement>(null);

  // Schedule preview overlay
  const {
    previewScheduleId,
    schedule: previewSchedule,
    appointments: previewAppointments,
    loading: previewLoading,
    stats: previewStats,
    openPreview,
    closePreview,
    updateAppointment,
  } = useSchedulePreview();

  // Fetch templates and schedules
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    apiRequest<Template[]>('/templates').then((r) => {
      if (!cancelled && r.ok && r.data) setTemplates(r.data);
    });
    apiRequest<Schedule[]>('/schedules').then((r) => {
      if (!cancelled && r.ok) {
        // Handle both array and paginated response
        const data = Array.isArray(r.data) ? r.data : (r.data as unknown as Schedule[]) || [];
        setSchedules(data);
      }
    });

    return () => { cancelled = true; };
  }, [user]);

  // Focus the modal input when it opens
  useEffect(() => {
    if (showInitialsModal && modalInputRef.current) {
      modalInputRef.current.focus();
    }
  }, [showInitialsModal]);

  // Keyboard listener — press 1 for wizard overlay, 2-6 for preset templates
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (showInitialsModal || creating || editorData || previewScheduleId || showWizard) return;

      if (e.key === '1') {
        setShowWizard(true);
        setError('');
        return;
      }

      const key = parseInt(e.key);
      if (key >= 2 && key <= 6) {
        const tmpl = templates.find((t) => t.hotkey === key);
        if (tmpl) {
          setSelectedTemplate(tmpl);
          setShowInitialsModal(true);
          setInitials('');
          setError('');
        }
      }
    },
    [templates, showInitialsModal, creating, editorData, previewScheduleId, showWizard],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showInitialsModal) {
        setShowInitialsModal(false);
        setSelectedTemplate(null);
        setInitials('');
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showInitialsModal]);

  // Auto-submit when 2 initials are typed — generate preview
  const handleInitialsChange = async (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z]/g, '').slice(0, 2);
    setInitials(cleaned);

    if (cleaned.length === 2 && selectedTemplate) {
      setShowInitialsModal(false);
      setGeneratingPreview(true);
      setError('');

      try {
        // Get alias
        const aliasResult = await apiRequest<{ alias: string; initials: string }>('/alias', {
          method: 'POST',
          body: JSON.stringify({ initials: cleaned }),
        });
        const alias = aliasResult.ok && aliasResult.data ? aliasResult.data.alias : cleaned.toUpperCase();

        // Generate schedule with rrule
        const today = new Date().toISOString().split('T')[0]!;
        const defaultTime = '09:00';
        const result = generateScheduleWithRRule({
          start_date: today,
          sessions_per_week: selectedTemplate.sessions_per_week,
          duration_weeks: selectedTemplate.duration_weeks,
          default_time: defaultTime,
        });

        setEditorData({
          initials: cleaned,
          alias,
          appointments: result.appointments,
          startDate: today,
          endDate: result.end_date,
          sessionsPerWeek: selectedTemplate.sessions_per_week,
          durationWeeks: selectedTemplate.duration_weeks,
          appointmentTime: defaultTime,
        });
      } catch {
        setError('Failed to generate preview. Please try again.');
        setSelectedTemplate(null);
      }

      setGeneratingPreview(false);
    }
  };

  // Save edited appointments via new endpoint
  const handleEditorSave = async (finalAppointments: GeneratedAppointment[]) => {
    if (!editorData) return;
    setCreating(true);
    setEditorData(null);
    setError('');

    try {
      const schedResult = await apiRequest<{ schedule: Schedule }>('/schedules/from-appointments', {
        method: 'POST',
        body: JSON.stringify({
          patient_initials: editorData.initials,
          patient_alias: editorData.alias,
          start_date: editorData.startDate,
          end_date: editorData.endDate,
          sessions_per_week: editorData.sessionsPerWeek,
          duration_weeks: editorData.durationWeeks,
          appointments: finalAppointments,
        }),
      });

      if (schedResult.ok && schedResult.data) {
        // Refresh schedules list, then open the preview overlay
        const refreshed = await apiRequest<Schedule[]>('/schedules');
        if (refreshed.ok) {
          const data = Array.isArray(refreshed.data) ? refreshed.data : (refreshed.data as unknown as Schedule[]) || [];
          setSchedules(data);
        }
        openPreview(schedResult.data.schedule.id);
      } else {
        setError(schedResult.error?.message || 'Failed to create schedule');
      }
    } catch {
      setError('Network error. Please try again.');
    }

    setCreating(false);
    setSelectedTemplate(null);
  };

  const handleEditorCancel = () => {
    setEditorData(null);
    setSelectedTemplate(null);
    setInitials('');
  };

  // Wizard completion — create schedule from wizard result (both keyboard & mouse wizard)
  const handleWizardComplete = async (result: WizardResult) => {
    setShowWizard(false);
    setGeneratingPreview(true);
    setError('');

    try {
      const preview = generateScheduleWithRRule({
        start_date: result.startDate,
        sessions_per_week: result.sessionsPerWeek,
        duration_weeks: result.durationWeeks,
        default_time: result.appointmentTime,
      });

      setEditorData({
        initials: result.patientInitials,
        alias: result.patientAlias,
        appointments: preview.appointments,
        startDate: result.startDate,
        endDate: preview.end_date,
        sessionsPerWeek: result.sessionsPerWeek,
        durationWeeks: result.durationWeeks,
        appointmentTime: result.appointmentTime,
      });
    } catch {
      setError('Failed to generate preview. Please try again.');
    }

    setGeneratingPreview(false);
  };

  if (authLoading) return <LoadingOverlay message="Loading dashboard..." />;
  if (!user) return null;

  return (
    <PageLayout>
    <div style={styles.page}>
      <header style={styles.header}>
        <OwlLogo size="md" linkTo="/dashboard" />
        <div style={styles.headerRight}>
          <button style={styles.headerBtn} onClick={() => navigate('/customize')}>Customize</button>
          <button style={styles.headerBtn} onClick={() => navigate('/profile')}>Profile</button>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <main id="main-content" style={styles.main}>
        <div style={styles.welcome}>
          <h1 style={styles.welcomeTitle}>
            {user.display_name ? `Welcome back, ${user.display_name}` : 'Welcome back'}
          </h1>
          <p style={styles.welcomeText}>Create a new schedule below, or press 2-6 for a preset</p>
        </div>

        <div style={error ? styles.error : { height: 0, overflow: 'hidden' }} aria-live="assertive" role="alert">
          {error ? `Error: ${error}` : ''}
        </div>

        {/* Inline Mouse-Friendly Wizard */}
        <DashboardWizard onComplete={handleWizardComplete} />

        {/* Quick Presets */}
        <div style={styles.presetsSection}>
          <div style={styles.presetsHeader}>
            <h3 style={styles.presetsTitle}>Quick Presets</h3>
            <button
              style={styles.keyboardHint}
              onClick={() => { setShowWizard(true); setError(''); }}
              title="Open keyboard-only wizard (hotkey: 1)"
            >
              <span style={styles.keyBadge}>1</span> Keyboard Mode
            </button>
          </div>
          <div style={styles.presetsGrid}>
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                style={styles.presetCard}
                onClick={() => {
                  setSelectedTemplate(tmpl);
                  setShowInitialsModal(true);
                  setInitials('');
                  setError('');
                }}
                aria-label={`Template ${tmpl.hotkey}: ${tmpl.name}, ${tmpl.sessions_per_week} times per week for ${tmpl.duration_weeks} weeks`}
              >
                <span style={styles.presetHotkey}>{tmpl.hotkey}</span>
                <div style={styles.presetText}>
                  <span style={styles.presetName}>{tmpl.name}</span>
                  <span style={styles.presetInfo}>
                    {tmpl.sessions_per_week}x/wk &middot; {tmpl.duration_weeks} wks
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Saved Schedules */}
        {schedules.length > 0 ? (
          <div style={styles.savedSection}>
            <h3 style={styles.savedTitle}>Saved Schedules</h3>
            <div style={styles.savedList}>
              {schedules.map((sched) => (
                <button
                  key={sched.id}
                  style={styles.savedCard}
                  onClick={() => openPreview(sched.id)}
                  aria-label={`Schedule for ${sched.patient_alias || sched.patient_initials}`}
                >
                  <span style={styles.savedAlias}>{sched.patient_alias || sched.patient_initials}</span>
                  <span style={styles.savedInfo}>
                    {sched.sessions_per_week}x/wk &middot; {sched.duration_weeks} wks &middot; {sched.start_date}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>No schedules yet. Create your first one above!</p>
          </div>
        )}
      </main>

      {/* Initials Modal */}
      {showInitialsModal && selectedTemplate && (
        <div
          style={styles.modalOverlay}
          onClick={() => setShowInitialsModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Enter patient initials"
        >
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>{selectedTemplate.name}</h3>
            <p style={styles.modalSubtitle}>
              {selectedTemplate.sessions_per_week}x/wk &middot; {selectedTemplate.duration_weeks} weeks
            </p>
            <label style={styles.modalLabel}>
              Patient Initials (2 letters)
              <input
                ref={modalInputRef}
                type="text"
                value={initials}
                onChange={(e) => handleInitialsChange(e.target.value)}
                style={styles.modalInput}
                maxLength={2}
                autoFocus
                placeholder="JB"
                aria-label="Patient initials, 2 letters"
              />
            </label>
          </div>
        </div>
      )}

      {/* Schedule Editor (drag-and-drop calendar) */}
      {editorData && (
        <ScheduleEditor
          appointments={editorData.appointments}
          patientInitials={editorData.initials}
          patientAlias={editorData.alias}
          startDate={editorData.startDate}
          endDate={editorData.endDate}
          sessionsPerWeek={editorData.sessionsPerWeek}
          durationWeeks={editorData.durationWeeks}
          appointmentTime={editorData.appointmentTime}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

      {(creating || generatingPreview) && (
        <LoadingOverlay message={creating ? 'Saving schedule...' : 'Generating preview...'} />
      )}

      {/* Keyboard-only Schedule Wizard */}
      {showWizard && (
        <ScheduleWizard
          onComplete={handleWizardComplete}
          onCancel={() => setShowWizard(false)}
        />
      )}

      {/* Schedule Preview Overlay */}
      {previewLoading && <LoadingOverlay message="Loading schedule..." />}
      {previewScheduleId && previewSchedule && (
        <SchedulePreviewOverlay
          schedule={previewSchedule}
          appointments={previewAppointments}
          stats={previewStats}
          onClose={closePreview}
          onToggleReminder={(apptId, newValue) => {
            // Overlay already called the PATCH API — just update local state
            updateAppointment(apptId, { reminder_sent: newValue });
          }}
        />
      )}
    </div>
    </PageLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--white)', borderBottom: '1px solid var(--gray-mid)' },
  headerRight: { display: 'flex', gap: '0.5rem' },
  headerBtn: { padding: '0.625rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--dark)' },
  logoutBtn: { padding: '0.5rem 1rem', background: 'var(--red-light)', color: 'var(--red-mid)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500 },
  main: { maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' },
  welcome: { marginBottom: '2rem' },
  welcomeTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' },
  welcomeText: { color: 'var(--gray-text)', fontSize: '0.9rem' },
  error: { background: 'var(--red-light)', color: 'var(--red-mid)', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', marginBottom: '1rem' },

  // Quick Presets
  presetsSection: { marginBottom: '2rem' },
  presetsHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  presetsTitle: { fontSize: '1rem', fontWeight: 600, color: 'var(--dark)' },
  keyboardHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.375rem 0.75rem',
    background: 'var(--orange-light)',
    border: '1px solid var(--orange-mid)',
    borderRadius: 'var(--radius)',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--orange-mid)',
    cursor: 'pointer',
  },
  keyBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    background: 'var(--orange-mid)',
    color: 'white',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '0.75rem',
  },
  presetsGrid: {
    display: 'flex',
    gap: '0.625rem',
    overflowX: 'auto' as const,
    paddingBottom: '0.25rem',
  },
  presetCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.75rem 1rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--green-light)',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'border-color 0.15s, box-shadow 0.15s',
    flexShrink: 0,
  },
  presetHotkey: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    minWidth: '28px',
    background: 'var(--green-dark)',
    color: 'white',
    borderRadius: '6px',
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    fontSize: '0.8rem',
  },
  presetText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.125rem',
  },
  presetName: {
    fontWeight: 600,
    fontSize: '0.85rem',
    color: 'var(--dark)',
  },
  presetInfo: {
    fontSize: '0.7rem',
    color: 'var(--gray-text)',
  },

  // Saved Schedules
  savedSection: { marginTop: '1rem' },
  savedTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark)', marginBottom: '0.75rem' },
  savedList: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  savedCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-mid)', textAlign: 'left' as const, cursor: 'pointer' },
  savedAlias: { fontWeight: 600, color: 'var(--dark)' },
  savedInfo: { fontSize: '0.8rem', color: 'var(--gray-text)' },
  emptyState: { textAlign: 'center' as const, padding: '2rem', background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--gray-mid)', marginTop: '1rem' },
  emptyText: { color: 'var(--gray-text)', fontSize: '0.9rem' },

  // Modals
  modalOverlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: '360px', textAlign: 'center' as const },
  modalTitle: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' },
  modalSubtitle: { color: 'var(--gray-text)', fontSize: '0.875rem', marginBottom: '1.5rem' },
  modalLabel: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 },
  modalInput: { padding: '1rem', fontSize: '2rem', textAlign: 'center' as const, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.5rem', border: '2px solid var(--green-mid)', borderRadius: 'var(--radius)', textTransform: 'uppercase' as const },
};
