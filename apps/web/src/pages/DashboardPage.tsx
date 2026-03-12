import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { apiRequest } from '../api/client.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';
import { ScheduleConfirmationModal } from '../components/schedule/ScheduleConfirmationModal.js';
import { SchedulePreviewOverlay } from '../components/schedule/SchedulePreviewOverlay.js';
import { ScheduleWizard, type WizardResult } from '../components/schedule/ScheduleWizard.js';
import { useSchedulePreview } from '../hooks/useSchedulePreview.js';
import { generateSchedule } from '@ptowl/shared';
import type { Template, Schedule, GeneratedAppointment } from '@ptowl/shared';

interface PendingSchedule {
  template: Template;
  initials: string;
  alias: string;
  appointments: GeneratedAppointment[];
  startDate: string;
  endDate: string;
}

export function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showInitialsModal, setShowInitialsModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [initials, setInitials] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<PendingSchedule | null>(null);
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

  // Keyboard listener — press 1 for wizard, 2-6 for preset templates
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't fire if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
      if (showInitialsModal || creating || pending || previewScheduleId || showWizard) return;

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
    [templates, showInitialsModal, creating, pending, previewScheduleId, showWizard],
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

        // Generate schedule preview client-side (same function API uses)
        const today = new Date().toISOString().split('T')[0]!;
        const result = generateSchedule({
          start_date: today,
          sessions_per_week: selectedTemplate.sessions_per_week,
          duration_weeks: selectedTemplate.duration_weeks,
        });

        setPending({
          template: selectedTemplate,
          initials: cleaned,
          alias,
          appointments: result.appointments,
          startDate: today,
          endDate: result.end_date,
        });
      } catch {
        setError('Failed to generate preview. Please try again.');
        setSelectedTemplate(null);
      }

      setGeneratingPreview(false);
    }
  };

  // Confirm and save schedule via API
  const handleConfirmSchedule = async () => {
    if (!pending) return;
    setCreating(true);
    setPending(null);
    setError('');

    try {
      const schedResult = await apiRequest<{ schedule: Schedule }>('/schedules', {
        method: 'POST',
        body: JSON.stringify({
          template_id: pending.template.id || undefined,
          patient_initials: pending.initials,
          start_date: pending.startDate,
          sessions_per_week: pending.template.sessions_per_week,
          duration_weeks: pending.template.duration_weeks,
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

  const handleCancelSchedule = () => {
    setPending(null);
    setSelectedTemplate(null);
    setInitials('');
  };

  // Wizard completion — create schedule from wizard result
  const handleWizardComplete = async (result: WizardResult) => {
    setShowWizard(false);
    setGeneratingPreview(true);
    setError('');

    try {
      const preview = generateSchedule({
        start_date: result.startDate,
        sessions_per_week: result.sessionsPerWeek,
        duration_weeks: result.durationWeeks,
      });

      setPending({
        template: {
          id: '',
          user_id: '',
          hotkey: 0,
          name: `Custom: ${result.bodyRegion}`,
          sessions_per_week: result.sessionsPerWeek,
          duration_weeks: result.durationWeeks,
          default_time: '09:00',
          is_active: 1,
          sort_order: 0,
          created_at: '',
          updated_at: '',
        },
        initials: result.patientInitials,
        alias: result.patientAlias,
        appointments: preview.appointments,
        startDate: result.startDate,
        endDate: preview.end_date,
      });
    } catch {
      setError('Failed to generate preview. Please try again.');
    }

    setGeneratingPreview(false);
  };

  if (authLoading) return <LoadingOverlay message="Loading dashboard..." />;
  if (!user) return null;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <OwlLogo size="md" linkTo="/dashboard" />
        <div style={styles.headerRight}>
          <button style={styles.headerBtn} onClick={() => navigate('/customize')}>Customize</button>
          <button style={styles.headerBtn} onClick={() => navigate('/profile')}>Profile</button>
          {user.role === 'admin' && (
            <button style={styles.headerBtn} onClick={() => navigate('/admin')}>Admin</button>
          )}
        </div>
      </header>

      <main id="main-content" style={styles.main}>
        <div style={styles.welcome}>
          <h2 style={styles.welcomeTitle}>
            {user.display_name ? `Welcome back, ${user.display_name}` : 'Welcome back'}
          </h2>
          <p style={styles.welcomeText}>Press 1 to create a custom routine, or 2-6 for a preset</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        {/* Template Grid */}
        <div style={styles.grid}>
          {/* Wizard card — always first at hotkey 1 */}
          <button
            style={{ ...styles.templateCard, borderColor: 'var(--orange-mid)', background: 'var(--orange-light)' }}
            onClick={() => { setShowWizard(true); setError(''); }}
            aria-label="Press 1: Create New Routine with the schedule wizard"
          >
            <span style={{ ...styles.hotkey, background: 'var(--orange-mid)' }} aria-hidden="true">1</span>
            <span style={styles.templateName}>Create New Routine</span>
            <span style={styles.templateInfo}>Custom wizard &middot; 6 quick steps</span>
          </button>
          {templates.map((tmpl) => (
            <button
              key={tmpl.id}
              style={styles.templateCard}
              onClick={() => {
                setSelectedTemplate(tmpl);
                setShowInitialsModal(true);
                setInitials('');
                setError('');
              }}
              aria-label={`Template ${tmpl.hotkey}: ${tmpl.name}, ${tmpl.sessions_per_week} times per week for ${tmpl.duration_weeks} weeks`}
            >
              <span style={styles.hotkey} aria-hidden="true">{tmpl.hotkey}</span>
              <span style={styles.templateName}>{tmpl.name}</span>
              <span style={styles.templateInfo}>
                {tmpl.sessions_per_week}x/wk &middot; {tmpl.duration_weeks} weeks
              </span>
            </button>
          ))}
        </div>

        {/* Saved Schedules */}
        {schedules.length > 0 && (
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

      {/* Schedule Confirmation Modal */}
      {pending && (
        <ScheduleConfirmationModal
          appointments={pending.appointments}
          patientAlias={pending.alias}
          patientInitials={pending.initials}
          startDate={pending.startDate}
          endDate={pending.endDate}
          sessionsPerWeek={pending.template.sessions_per_week}
          durationWeeks={pending.template.duration_weeks}
          templateName={pending.template.name}
          onConfirm={handleConfirmSchedule}
          onCancel={handleCancelSchedule}
        />
      )}

      {(creating || generatingPreview) && (
        <LoadingOverlay message={creating ? 'Saving schedule...' : 'Generating preview...'} />
      )}

      {/* Schedule Wizard */}
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
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'var(--white)', borderBottom: '1px solid var(--gray-mid)' },
  headerRight: { display: 'flex', gap: '0.5rem' },
  headerBtn: { padding: '0.5rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--dark)' },
  main: { maxWidth: '960px', margin: '0 auto', padding: '2rem 1.5rem' },
  welcome: { marginBottom: '2rem' },
  welcomeTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' },
  welcomeText: { color: 'var(--gray-text)', fontSize: '0.9rem' },
  error: { background: 'var(--red-light)', color: 'var(--red-mid)', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.875rem', marginBottom: '1rem' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2.5rem' },
  templateCard: { display: 'flex', flexDirection: 'column' as const, padding: '1.25rem', background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '2px solid var(--green-light)', textAlign: 'left' as const, transition: 'border-color 0.15s, box-shadow 0.15s', cursor: 'pointer' },
  hotkey: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--green-dark)', color: 'white', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', marginBottom: '0.75rem' },
  templateName: { fontWeight: 600, fontSize: '1rem', color: 'var(--dark)', marginBottom: '0.25rem' },
  templateInfo: { fontSize: '0.8rem', color: 'var(--gray-text)' },
  savedSection: { marginTop: '1rem' },
  savedTitle: { fontSize: '1.1rem', fontWeight: 600, color: 'var(--dark)', marginBottom: '0.75rem' },
  savedList: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  savedCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem 1rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-mid)', textAlign: 'left' as const, cursor: 'pointer' },
  savedAlias: { fontWeight: 600, color: 'var(--dark)' },
  savedInfo: { fontSize: '0.8rem', color: 'var(--gray-text)' },
  modalOverlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: '360px', textAlign: 'center' as const },
  modalTitle: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' },
  modalSubtitle: { color: 'var(--gray-text)', fontSize: '0.875rem', marginBottom: '1.5rem' },
  modalLabel: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 },
  modalInput: { padding: '1rem', fontSize: '2rem', textAlign: 'center' as const, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.5rem', border: '2px solid var(--green-mid)', borderRadius: 'var(--radius)', textTransform: 'uppercase' as const },
};
