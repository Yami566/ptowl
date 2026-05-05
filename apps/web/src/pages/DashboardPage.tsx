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
  patientEmail?: string; // optional — enables 24h + 1h reminder emails
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
  const [schedulesLoaded, setSchedulesLoaded] = useState(false);
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

  // Smart Greeting — hour bucket picks tone bracket; day-of-week picks variant.
  // No RNG: deterministic per visit so the same user opening the dashboard
  // twice in a row at the same hour sees the same line. ~28 variants total.
  const greeting = useMemo(() => {
    const now = new Date();
    const h = now.getHours();
    const dow = now.getDay(); // Sun=0..Sat=6
    const name = user?.display_name;
    const sub = (s: string): string =>
      name
        ? s.replace(/\{Name\}/g, name)
        : s
            .replace(/, \{Name\}/g, '')
            .replace(/ \{Name\}/g, '')
            .replace(/\{Name\}/g, '');

    // Morning < 12, afternoon < 17, evening < 20, late >= 20.
    // Each bucket has 7 variants indexed by day-of-week (Sun=0..Sat=6).
    const variants: string[] =
      h < 12
        ? [
            'Sunday rounds, {Name}. Owls work weekends.',
            "Game day, Coach. Let's start the week strong.",
            "Charts cleared, {Name}. Tuesday's looking clean.",
            'Hump day. The owl believes in you, {Name}.',
            'Almost Friday, Coach. Hold the line.',
            'Friday, {Name}. Schedules first, weekend second.',
            'Saturday rounds, {Name}? The owl is impressed.',
          ]
        : h < 17
          ? [
              'Sunday afternoon. Easy schedules ahead, {Name}.',
              "Monday halftime, Coach. You're winning.",
              "Afternoon, {Name}. Schedule like nobody's watching.",
              'Mid-week, {Name}. 5 keys and done — go.',
              "Thursday's a good day to be a doctor, {Name}.",
              'Friday afternoon, Coach. Almost home.',
              "Saturday clinic, {Name}? You're a hero.",
            ]
          : h < 20
            ? [
                'Sunday evening prep, {Name}. The week is yours.',
                'Monday wrap, Coach. Mark it as a win.',
                'Tuesday evening, {Name}. Easy charts before dinner.',
                'Wednesday wrap-up. The owl is proud, {Name}.',
                'Thursday evening, Coach. One more push to Friday.',
                'Friday evening, {Name}. Schedule. Print. Go home.',
                'Saturday evening rounds? You earned the night, {Name}.',
              ]
            : [
                'Sunday night, {Name}? The owl is concerned but supportive.',
                "Monday night clinic? You're built different, Coach.",
                'Late Tuesday, {Name}. Hydrate.',
                'Wednesday late shift. The owl salutes you, {Name}.',
                'Late Thursday, Coach. Tomorrow is the last whistle.',
                'Friday night, {Name}? Print and run.',
                'Saturday night clinic, {Name}? The owl is impressed and worried.',
              ];

    return sub(variants[dow] ?? variants[0]!);
  }, [user?.display_name]);

  // #1 Today's active schedules
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0]!, []);
  const activeToday = useMemo(
    () => schedules.filter((s) => s.start_date <= todayStr && s.end_date >= todayStr),
    [schedules, todayStr],
  );

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
        const savedOrder: string[] = JSON.parse(
          localStorage.getItem('ptowl-schedule-order') || '[]',
        );
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
      if (!cancelled) setSchedulesLoaded(true);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // First-visit splash: if the user has no saved schedules and hasn't
  // dismissed the welcome wizard before, auto-open the keyboard wizard
  // overlay so the dashboard greets them with a clear "create your first
  // schedule" call-to-action instead of an empty page. Returning users
  // who dismiss it once never see it again (localStorage flag).
  useEffect(() => {
    if (!user || !schedulesLoaded || schedules.length > 0) return;
    if (localStorage.getItem('ptowl-welcome-wizard-dismissed') === '1') return;
    const t = setTimeout(() => setShowWizard(true), 400);
    return () => clearTimeout(t);
  }, [user, schedulesLoaded, schedules.length]);

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
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      )
        return;
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
        const alias =
          aliasResult.ok && aliasResult.data ? aliasResult.data.alias : cleaned.toUpperCase();

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
        // If clinic supplied a patient email in the wizard, enable reminders
        // for the new schedule (best-effort — failure is non-fatal).
        if (editorData.patientEmail) {
          await apiRequest(`/schedules/${schedResult.data.schedule.id}/reminders`, {
            method: 'PUT',
            body: JSON.stringify({
              patient_email: editorData.patientEmail,
              reminders_enabled: true,
            }),
          }).catch(() => {});
        }

        // Refresh schedules list, then open the preview overlay
        const refreshed = await apiRequest<Schedule[]>('/schedules');
        if (refreshed.ok) {
          const data = Array.isArray(refreshed.data)
            ? refreshed.data
            : (refreshed.data as unknown as Schedule[]) || [];
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
        patientEmail: result.patientEmail,
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
            <details style={styles.menuRoot} className="ptowl-menu">
              <summary style={styles.menuSummary} aria-label="Open profile menu">
                Profile &#9662;
              </summary>
              <div style={styles.menuPanel} role="menu">
                <button
                  style={styles.menuItem}
                  role="menuitem"
                  onClick={() => navigate('/profile')}
                >
                  Profile &amp; Clinic Info
                </button>
                <button
                  style={styles.menuItem}
                  role="menuitem"
                  onClick={() => navigate('/customize/templates')}
                >
                  Edit Templates
                </button>
                <button
                  style={styles.menuItem}
                  role="menuitem"
                  onClick={() => navigate('/customize/print')}
                >
                  Print Settings
                </button>
                <button
                  style={{ ...styles.menuItem, ...styles.menuItemDanger }}
                  role="menuitem"
                  onClick={logout}
                >
                  Sign out
                </button>
              </div>
            </details>
          </div>
        </header>

        <main id="main-content" style={styles.main} className="ptowl-main">
          <div style={styles.welcome}>
            <h1 style={styles.welcomeTitle} className="ptowl-page-title">
              {greeting}
            </h1>
            <p style={styles.welcomeText}>
              Create a new schedule below, or press 2-6 for a preset.
            </p>
          </div>

          {/* #1 Today's Appointments Card */}
          {activeToday.length > 0 && (
            <div style={styles.todayCard}>
              <div style={styles.todayHeader}>
                <span style={styles.todayDot} />
                <strong>Today</strong>
                <span style={styles.todayCount}>
                  {activeToday.length} active schedule{activeToday.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={styles.todayList}>
                {activeToday.map((s) => (
                  <button key={s.id} style={styles.todayItem} onClick={() => openPreview(s.id)}>
                    <span style={{ fontWeight: 600 }}>{s.patient_alias || s.patient_initials}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--gray-text)' }}>
                      {s.sessions_per_week}x/wk
                    </span>
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
              <button
                style={styles.quickAction}
                onClick={() => navigate(`/schedule/${schedules[0]!.id}`)}
              >
                <span style={styles.quickActionIcon}>&#128424;</span>
                <span style={styles.quickActionLabel}>Print Last</span>
              </button>
            )}
            {schedules.length > 0 && (
              <button
                style={styles.quickAction}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(window.location.href);
                    toast.success('Link copied!');
                  } catch {
                    // ignore
                  }
                }}
              >
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
                <div key={tmpl.id} style={styles.presetCardWrap}>
                  <button
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
                  <button
                    style={styles.deleteTemplateBtn}
                    title="Delete template"
                    aria-label={`Delete template ${tmpl.name}`}
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm(`Delete template "${tmpl.name}"?`)) return;
                      const res = await apiRequest(`/templates/${tmpl.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        setTemplates((prev) => prev.filter((t) => t.id !== tmpl.id));
                        toast.success('Template deleted');
                      } else {
                        toast.error('Failed to delete template');
                      }
                    }}
                  >
                    &#10005;
                  </button>
                </div>
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
                <div style={styles.shortcutItem}>
                  <kbd style={styles.emptyKbd}>1</kbd> Open wizard
                </div>
                <div style={styles.shortcutItem}>
                  <kbd style={styles.emptyKbd}>2</kbd>-<kbd style={styles.emptyKbd}>6</kbd> Quick
                  preset
                </div>
                <div style={styles.shortcutItem}>
                  <kbd style={styles.emptyKbd}>Cmd+K</kbd> Command palette
                </div>
                <div style={styles.shortcutItem}>
                  <kbd style={styles.emptyKbd}>Enter</kbd> Confirm / Generate
                </div>
                <div style={styles.shortcutItem}>
                  <kbd style={styles.emptyKbd}>Esc</kbd> Close modal
                </div>
                <div style={styles.shortcutItem}>
                  <kbd style={styles.emptyKbd}>P</kbd> Print (on schedule page)
                </div>
              </div>
            )}
          </div>

          {/* Saved Schedules */}
          {schedules.length > 0 ? (
            <div style={styles.savedSection}>
              <h3 style={styles.savedTitle}>Saved Schedules</h3>
              <div style={styles.savedList}>
                {schedules.map((sched, idx) => {
                  const status =
                    sched.end_date < todayStr
                      ? 'past'
                      : sched.start_date > todayStr
                        ? 'upcoming'
                        : 'active';
                  const chipStyle =
                    status === 'active'
                      ? styles.chipActive
                      : status === 'upcoming'
                        ? styles.chipUpcoming
                        : styles.chipPast;
                  const chipLabel =
                    status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Past';
                  return (
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
                      aria-label={`Schedule for ${sched.patient_alias || sched.patient_initials} (${chipLabel.toLowerCase()})`}
                    >
                      <span style={styles.dragHandle}>&#8942;&#8942;</span>
                      <span style={styles.savedAlias}>
                        {sched.patient_alias || sched.patient_initials}
                      </span>
                      <span style={{ ...styles.statusChip, ...chipStyle }}>{chipLabel}</span>
                      <span style={styles.savedInfo}>
                        {sched.sessions_per_week}x/wk &middot; {sched.duration_weeks} wks &middot;{' '}
                        {sched.start_date}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={styles.emptyState} role="status" aria-live="polite">
              <div style={styles.emptyIcon} aria-hidden="true">
                🦉
              </div>
              <h3 style={styles.emptyTitle}>Let&apos;s make your first schedule.</h3>
              <p style={styles.emptyText}>
                Press <kbd style={styles.emptyKbd}>1</kbd> for the wizard (custom dates +
                frequency), or pick a preset with <kbd style={styles.emptyKbd}>2</kbd>–
                <kbd style={styles.emptyKbd}>6</kbd>. Type two-letter initials, hit{' '}
                <kbd style={styles.emptyKbd}>Enter</kbd>, you&apos;re done. Five keypresses, max.
              </p>
              <p style={styles.emptyHint}>
                First time? The{' '}
                <a href="/about" style={styles.emptyLink}>
                  about page
                </a>{' '}
                walks through the workflow in 90 seconds.
              </p>
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
                {selectedTemplate.sessions_per_week}x/wk &middot; {selectedTemplate.duration_weeks}{' '}
                weeks
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

        {/* Keyboard-only Schedule Wizard (also serves as the first-visit splash) */}
        {showWizard && (
          <ScheduleWizard
            onComplete={handleWizardComplete}
            onCancel={() => {
              setShowWizard(false);
              localStorage.setItem('ptowl-welcome-wizard-dismissed', '1');
            }}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: 'var(--white)',
    borderBottom: '1px solid var(--gray-mid)',
  },
  headerRight: { display: 'flex', gap: '0.5rem' },
  menuRoot: {
    position: 'relative' as const,
  },
  menuSummary: {
    listStyle: 'none' as const,
    cursor: 'pointer',
    padding: '0.625rem 1rem',
    background: 'var(--gray-light)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--dark)',
    userSelect: 'none' as const,
  },
  menuPanel: {
    position: 'absolute' as const,
    top: 'calc(100% + 0.25rem)',
    right: 0,
    minWidth: '12rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--gray-mid)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    padding: '0.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.125rem',
    zIndex: 50,
  },
  menuItem: {
    textAlign: 'left' as const,
    padding: '0.5rem 0.75rem',
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: 'var(--dark)',
    cursor: 'pointer',
  },
  menuItemDanger: {
    color: 'var(--red-mid)',
    marginTop: '0.25rem',
    borderTop: '1px solid var(--gray-mid)',
    paddingTop: '0.5rem',
    borderRadius: 0,
  },
  main: {
    maxWidth: 'clamp(320px, 95vw, 1400px)',
    margin: '0 auto',
    padding: '2rem clamp(1rem, 3vw, 3rem)',
  },
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
    gap: '0.5rem',
    padding: '1.25rem 1rem',
    background: 'var(--white)',
    border: '2px solid var(--gray-mid)',
    borderRadius: 'var(--radius-lg)',
    cursor: 'pointer',
    transition: 'transform 0.2s, border-color 0.15s, box-shadow 0.2s',
    minWidth: '120px',
  },
  quickActionIcon: {
    fontSize: '1.75rem',
  },
  quickActionLabel: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--dark)',
  },
  welcomeTitle: {
    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.5rem',
  },
  welcomeText: { color: 'var(--gray-text)', fontSize: '0.9rem' },
  // Quick Presets
  presetsSection: { marginBottom: '2rem' },
  presetsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
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
  presetCardWrap: {
    position: 'relative' as const,
    flexShrink: 0,
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
    width: '100%',
  },
  deleteTemplateBtn: {
    position: 'absolute' as const,
    top: '-6px',
    right: '-6px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: 'var(--red-light)',
    color: 'var(--red-mid)',
    border: '1px solid var(--red-mid)',
    fontSize: '0.65rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    padding: 0,
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
  savedTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--dark)',
    marginBottom: '0.75rem',
  },
  savedList: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  savedCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.875rem 1rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--gray-mid)',
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  savedAlias: { fontWeight: 600, color: 'var(--dark)' },
  savedInfo: { fontSize: '0.8rem', color: 'var(--gray-text)' },
  emptyState: {
    textAlign: 'center' as const,
    padding: '2.5rem 2rem',
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    border: '1px dashed var(--gray-mid)',
    marginTop: '1rem',
  },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '0.75rem' },
  emptyTitle: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: 'var(--dark)',
    margin: '0 0 0.75rem',
  },
  emptyText: {
    color: 'var(--dark-alt)',
    fontSize: '0.95rem',
    lineHeight: 1.6,
    maxWidth: '480px',
    margin: '0 auto 1rem',
  },
  emptyHint: {
    color: 'var(--gray-text)',
    fontSize: '0.85rem',
    margin: 0,
  },
  emptyLink: {
    color: 'var(--green-mid)',
    fontWeight: 500,
    textDecoration: 'underline',
  },
  emptyKbd: {
    display: 'inline-block',
    padding: '0.125rem 0.4rem',
    background: 'var(--gray-light)',
    border: '1px solid var(--gray-mid)',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.85em',
    fontWeight: 600,
    color: 'var(--dark)',
    margin: '0 0.125rem',
  },

  // Saved-schedule status chip (Active / Upcoming / Past)
  statusChip: {
    display: 'inline-block',
    padding: '0.15rem 0.5rem',
    borderRadius: '999px',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    marginLeft: '0.5rem',
  },
  chipActive: {
    background: 'var(--green-bg)',
    color: 'var(--green-dark)',
  },
  chipUpcoming: {
    background: 'var(--orange-light)',
    color: 'var(--orange-mid)',
  },
  chipPast: {
    background: 'var(--gray-light)',
    color: 'var(--gray-text)',
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
  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '2rem',
    width: '100%',
    maxWidth: '360px',
    textAlign: 'center' as const,
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: 'var(--dark)',
    marginBottom: '0.25rem',
  },
  modalSubtitle: { color: 'var(--gray-text)', fontSize: '0.875rem', marginBottom: '1.5rem' },
  modalLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  modalInput: {
    padding: '1rem',
    fontSize: '2rem',
    textAlign: 'center' as const,
    fontFamily: 'var(--font-mono)',
    fontWeight: 700,
    letterSpacing: '0.5rem',
    border: '2px solid var(--green-mid)',
    borderRadius: 'var(--radius)',
    textTransform: 'uppercase' as const,
  },
};
