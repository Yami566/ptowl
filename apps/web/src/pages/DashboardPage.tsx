import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
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
import { OnboardingChecklist } from '../components/OnboardingChecklist.js';
import type { WizardResult } from '../components/schedule/wizard-constants.js';
import { useSchedulePreview } from '../hooks/useSchedulePreview.js';
import { generateScheduleWithRRule } from '@ptowl/shared';
import type { Template, Schedule, GeneratedAppointment } from '@ptowl/shared';
import { useOwlReaction } from '../hooks/useOwlReaction.js';

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
  const owlReaction = useOwlReaction();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showInitialsModal, setShowInitialsModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [initials, setInitials] = useState('');
  const [creating, setCreating] = useState(false);
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

  // #6 Keyboard shortcuts cheat sheet
  const [showShortcuts, setShowShortcuts] = useState(false);

  // #8 Drag-to-reorder state
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // #9 Smart Greeting — time-of-day aware
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    const name = user?.display_name;
    if (h < 12) return name ? `Good morning, ${name}` : 'Good morning';
    if (h < 17) return name ? `Good afternoon, ${name}` : 'Good afternoon';
    if (h < 20) return name ? `Good evening, ${name}` : 'Good evening';
    return name ? `Working late, ${name}?` : 'Working late?';
  }, [user?.display_name]);

  // #1 Today's active schedules
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0]!, []);
  const activeToday = useMemo(
    () => schedules.filter((s) => s.start_date <= todayStr && s.end_date >= todayStr),
    [schedules, todayStr],
  );

  // #5 Patient count — unique patient initials
  const patientCount = useMemo(
    () => new Set(schedules.map((s) => s.patient_initials)).size,
    [schedules],
  );

  // #2 Schedule streak counter
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    const key = 'ptowl-streak-dates';
    const stored: string[] = JSON.parse(localStorage.getItem(key) || '[]');
    const today = new Date().toISOString().split('T')[0]!;
    if (!stored.includes(today)) stored.push(today);
    // Keep last 60 days only
    const recent = stored.filter((d) => {
      const diff = (new Date(today).getTime() - new Date(d).getTime()) / 86400000;
      return diff < 60;
    });
    localStorage.setItem(key, JSON.stringify(recent));
    // Count consecutive days ending today
    let count = 0;
    const sorted = [...recent].sort().reverse();
    for (let i = 0; i < sorted.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (sorted[i] === expected.toISOString().split('T')[0]) count++;
      else break;
    }
    setStreak(count);
  }, []);

  // #3 Mini calendar heatmap data — 30 days from today
  const heatmapDays = useMemo(() => {
    const days: Array<{ date: string; active: boolean; isToday: boolean }> = [];
    const now = new Date();
    for (let i = -14; i <= 15; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const iso = d.toISOString().split('T')[0]!;
      const active = schedules.some((s) => s.start_date <= iso && s.end_date >= iso);
      days.push({ date: iso, active, isToday: i === 0 });
    }
    return days;
  }, [schedules]);

  // #8 Drag-to-reorder handlers
  const handleDragStart = useCallback((idx: number) => setDragIdx(idx), []);
  const handleDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), []);
  const handleDrop = useCallback(
    (targetIdx: number) => {
      if (dragIdx === null || dragIdx === targetIdx) return;
      setSchedules((prev) => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(targetIdx, 0, moved!);
        // Persist order in localStorage
        localStorage.setItem('ptowl-schedule-order', JSON.stringify(next.map((s) => s.id)));
        return next;
      });
      setDragIdx(null);
    },
    [dragIdx],
  );

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
        // #8 Restore saved order
        const savedOrder: string[] = JSON.parse(localStorage.getItem('ptowl-schedule-order') || '[]');
        if (savedOrder.length > 0) {
          data.sort((a, b) => {
            const ai = savedOrder.indexOf(a.id);
            const bi = savedOrder.indexOf(b.id);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          });
        }
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
        return;
      }

      const key = parseInt(e.key);
      if (key >= 2 && key <= 6) {
        const tmpl = templates.find((t) => t.hotkey === key);
        if (tmpl) {
          setSelectedTemplate(tmpl);
          setShowInitialsModal(true);
          setInitials('');
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
        toast.error('Failed to generate preview. Please try again.');
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
        toast.success('Schedule created successfully!');
        owlReaction.onScheduleCreated();
        // Confetti celebration (respects reduced motion)
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 } });
        }
        // Onboarding event
        window.dispatchEvent(new CustomEvent('ptowl-onboarding', { detail: 'schedule' }));
      } else {
        toast.error(schedResult.error?.message || 'Failed to create schedule');
      }
    } catch {
      toast.error('Network error. Please try again.');
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
      toast.error('Failed to generate preview. Please try again.');
    }

    setGeneratingPreview(false);
  };

  if (authLoading) return <LoadingOverlay message="Loading dashboard..." />;
  if (!user) return null;

  return (
    <PageLayout>
    <div style={styles.page}>
      <header style={styles.header} className="ptowl-header">
        <OwlLogo size="md" linkTo="/" />
        <div style={styles.headerRight} className="ptowl-header-actions">
          <button style={styles.headerBtn} onClick={() => navigate('/customize')}>Customize</button>
          <button style={styles.headerBtn} onClick={() => navigate('/profile')}>Profile</button>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <main id="main-content" style={styles.main} className="ptowl-main">
        <OnboardingChecklist />
        <div style={styles.welcome}>
          <h1 style={styles.welcomeTitle} className="ptowl-page-title">{greeting}</h1>
          <p style={styles.welcomeText}>
            Create a new schedule below, or press 2-6 for a preset
            {patientCount > 0 && (
              <span style={styles.patientBadge}>{patientCount} patient{patientCount !== 1 ? 's' : ''}</span>
            )}
            {streak > 1 && (
              <span style={styles.streakBadge}>{streak}-day streak</span>
            )}
          </p>
        </div>

        {/* #1 Today's Appointments Card */}
        {activeToday.length > 0 && (
          <div style={styles.todayCard}>
            <div style={styles.todayHeader}>
              <span style={styles.todayDot} />
              <strong>Today</strong>
              <span style={styles.todayCount}>{activeToday.length} active schedule{activeToday.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={styles.todayList}>
              {activeToday.map((s) => (
                <button key={s.id} style={styles.todayItem} onClick={() => openPreview(s.id)}>
                  <span style={{ fontWeight: 600 }}>{s.patient_alias || s.patient_initials}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-text)' }}>{s.sessions_per_week}x/wk</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions Row */}
        <div style={styles.quickActionsRow}>
          <button style={styles.quickAction} onClick={() => setShowWizard(true)}>
            <span style={styles.quickActionIcon}>&#10010;</span>
            <span style={styles.quickActionLabel}>New Schedule</span>
          </button>
          {schedules.length > 0 && (
            <button style={styles.quickAction} onClick={() => navigate(`/schedule/${schedules[0]!.id}`)}>
              <span style={styles.quickActionIcon}>&#128424;</span>
              <span style={styles.quickActionLabel}>Print Last</span>
            </button>
          )}
          {schedules.length > 0 && (
            <button style={styles.quickAction} onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied!');
              } catch {
                // ignore
              }
            }}>
              <span style={styles.quickActionIcon}>&#128279;</span>
              <span style={styles.quickActionLabel}>Copy Link</span>
            </button>
          )}
        </div>

        {/* Inline Mouse-Friendly Wizard */}
        <DashboardWizard onComplete={handleWizardComplete} />

        {/* Quick Presets */}
        <div style={styles.presetsSection}>
          <div style={styles.presetsHeader}>
            <h3 style={styles.presetsTitle}>Quick Presets</h3>
            <button
              style={styles.keyboardHint}
              onClick={() => setShowWizard(true)}
              title="Open keyboard-only wizard (hotkey: 1)"
            >
              <span style={styles.keyBadge}>1</span> Keyboard Mode
            </button>
          </div>
          <div style={styles.presetsGrid} className="dash-presets-grid">
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                style={styles.presetCard}
                className="dash-preset-card"
                onClick={() => {
                  setSelectedTemplate(tmpl);
                  setShowInitialsModal(true);
                  setInitials('');
                        }}
                title={`${tmpl.name}\n${tmpl.sessions_per_week} sessions/week for ${tmpl.duration_weeks} weeks\nHotkey: ${tmpl.hotkey}`}
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

        {/* #6 Keyboard Shortcut Cheat Sheet */}
        <div style={styles.shortcutsWrap}>
          <button style={styles.shortcutsToggle} onClick={() => setShowShortcuts(!showShortcuts)}>
            {showShortcuts ? 'Hide Shortcuts' : 'Show Shortcuts'}
          </button>
          {showShortcuts && (
            <div style={styles.shortcutsGrid}>
              <div style={styles.shortcutItem}><kbd style={styles.kbd}>1</kbd> Open wizard</div>
              <div style={styles.shortcutItem}><kbd style={styles.kbd}>2</kbd>-<kbd style={styles.kbd}>6</kbd> Quick preset</div>
              <div style={styles.shortcutItem}><kbd style={styles.kbd}>Cmd+K</kbd> Command palette</div>
              <div style={styles.shortcutItem}><kbd style={styles.kbd}>Enter</kbd> Confirm / Generate</div>
              <div style={styles.shortcutItem}><kbd style={styles.kbd}>Esc</kbd> Close modal</div>
              <div style={styles.shortcutItem}><kbd style={styles.kbd}>P</kbd> Print (on schedule page)</div>
            </div>
          )}
        </div>

        {/* #3 Mini Calendar Heatmap */}
        {schedules.length > 0 && (
          <div style={styles.heatmapWrap}>
            <h4 style={styles.heatmapTitle}>30-Day Activity</h4>
            <div style={styles.heatmapGrid}>
              {heatmapDays.map((day) => (
                <div
                  key={day.date}
                  title={day.date}
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    background: day.isToday
                      ? 'var(--orange-mid)'
                      : day.active
                        ? 'var(--green-mid)'
                        : 'var(--gray-light)',
                    border: day.isToday ? '1px solid var(--orange-mid)' : 'none',
                  }}
                />
              ))}
            </div>
            <div style={styles.heatmapLegend}>
              <span style={styles.heatmapLegendDot}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--gray-light)', display: 'inline-block' }} /> No activity</span>
              <span style={styles.heatmapLegendDot}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green-mid)', display: 'inline-block' }} /> Active</span>
              <span style={styles.heatmapLegendDot}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--orange-mid)', display: 'inline-block' }} /> Today</span>
            </div>
          </div>
        )}

        {/* Saved Schedules */}
        {schedules.length > 0 ? (
          <div style={styles.savedSection}>
            <h3 style={styles.savedTitle}>Saved Schedules</h3>
            <div style={styles.savedList}>
              {schedules.map((sched, idx) => (
                <button
                  key={sched.id}
                  style={{
                    ...styles.savedCard,
                    ...(dragIdx === idx ? { opacity: 0.5 } : {}),
                  }}
                  className="dash-saved-card"
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={() => setDragIdx(null)}
                  onClick={() => openPreview(sched.id)}
                  aria-label={`Schedule for ${sched.patient_alias || sched.patient_initials}`}
                >
                  <span style={styles.dragHandle}>&#8942;&#8942;</span>
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
          <div style={styles.modal} className="dash-modal" onClick={(e) => e.stopPropagation()}>
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
  main: { maxWidth: 'clamp(720px, 65vw, 1200px)', margin: '0 auto', padding: '2rem 1.5rem' },
  welcome: { marginBottom: '1.5rem' },
  quickActionsRow: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '2rem',
  },
  quickAction: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.875rem 0.5rem',
    background: 'var(--white)',
    border: '1px solid var(--gray-mid)',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  quickActionIcon: {
    fontSize: '1.25rem',
  },
  quickActionLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--dark)',
  },
  welcomeTitle: { fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' },
  welcomeText: { color: 'var(--gray-text)', fontSize: '0.9rem' },
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

  // #9 Smart Greeting + #5 Patient Count + #2 Streak
  patientBadge: {
    display: 'inline-block',
    marginLeft: '0.75rem',
    padding: '0.15rem 0.5rem',
    background: 'var(--green-bg)',
    color: 'var(--green-dark)',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  streakBadge: {
    display: 'inline-block',
    marginLeft: '0.5rem',
    padding: '0.15rem 0.5rem',
    background: 'var(--orange-light)',
    color: 'var(--orange-mid)',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },

  // #1 Today's Card
  todayCard: {
    background: 'var(--white)',
    border: '1px solid var(--green-mid)',
    borderRadius: 'var(--radius)',
    padding: '0.75rem 1rem',
    marginBottom: '1.25rem',
  },
  todayHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    marginBottom: '0.5rem',
  },
  todayDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--green-mid)',
    flexShrink: 0,
  },
  todayCount: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    marginLeft: 'auto',
  },
  todayList: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  todayItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.375rem 0.625rem',
    background: 'var(--green-bg)',
    borderRadius: 'var(--radius)',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
  },

  // #6 Keyboard shortcuts
  shortcutsWrap: {
    marginBottom: '1.25rem',
  },
  shortcutsToggle: {
    padding: '0.375rem 0.75rem',
    background: 'var(--gray-light)',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--gray-text)',
    cursor: 'pointer',
  },
  shortcutsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '0.5rem',
    marginTop: '0.5rem',
    padding: '0.75rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--gray-mid)',
    fontSize: '0.8rem',
    color: 'var(--dark)',
  },
  shortcutItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  kbd: {
    display: 'inline-block',
    padding: '0.125rem 0.375rem',
    background: 'var(--gray-light)',
    border: '1px solid var(--gray-mid)',
    borderRadius: '3px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },

  // #3 Mini calendar heatmap
  heatmapWrap: {
    marginBottom: '1.25rem',
  },
  heatmapTitle: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--gray-text)',
    marginBottom: '0.375rem',
  },
  heatmapGrid: {
    display: 'flex',
    gap: '3px',
    flexWrap: 'wrap' as const,
  },
  heatmapLegend: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '0.375rem',
    fontSize: '0.65rem',
    color: 'var(--gray-text)',
  },
  heatmapLegendDot: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },

  // #8 Drag handle
  dragHandle: {
    color: 'var(--gray-text)',
    fontSize: '0.75rem',
    cursor: 'grab',
    userSelect: 'none' as const,
    letterSpacing: '-2px',
    opacity: 0.5,
  },

  // Modals
  modalOverlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modal: { background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: '360px', textAlign: 'center' as const },
  modalTitle: { fontSize: '1.25rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' },
  modalSubtitle: { color: 'var(--gray-text)', fontSize: '0.875rem', marginBottom: '1.5rem' },
  modalLabel: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', fontSize: '0.875rem', fontWeight: 500 },
  modalInput: { padding: '1rem', fontSize: '2rem', textAlign: 'center' as const, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.5rem', border: '2px solid var(--green-mid)', borderRadius: 'var(--radius)', textTransform: 'uppercase' as const },
};
