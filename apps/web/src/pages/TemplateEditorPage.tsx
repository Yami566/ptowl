import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext.js';
import { apiRequest } from '../api/client.js';
import { OwlLogo } from '../components/layout/OwlLogo.js';
import { PageLayout } from '../components/layout/PageLayout.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { LoadingOverlay } from '../components/LoadingOverlay.js';
import type { Template } from '@ptowl/shared';

export function TemplateEditorPage() {
  usePageTitle('Edit Templates');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Editable state per template
  const [edits, setEdits] = useState<Record<string, Partial<Template>>>({});

  useEffect(() => {
    apiRequest<Template[]>('/templates').then((r) => {
      if (r.ok && r.data) setTemplates(r.data);
      setLoading(false);
    });
  }, []);

  if (!user) return null;

  const getEditValue = <K extends keyof Template>(id: string, field: K): Template[K] => {
    const template = templates.find((t) => t.id === id);
    if (!template) return '' as Template[K];
    return (edits[id]?.[field] ?? template[field]) as Template[K];
  };

  const setEditValue = (id: string, field: keyof Template, value: string | number) => {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const handleSave = async (id: string) => {
    const changes = edits[id];
    if (!changes || Object.keys(changes).length === 0) return;

    setSaving(id);

    const result = await apiRequest<Template>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(changes),
    });

    if (result.ok && result.data) {
      setTemplates((prev) => prev.map((t) => (t.id === id ? result.data! : t)));
      setEdits((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success('Template saved!');
      window.dispatchEvent(new CustomEvent('ptowl-onboarding', { detail: 'template' }));
    } else {
      toast.error(result.error?.message || 'Failed to save');
    }
    setSaving(null);
  };

  const handleToggleActive = async (template: Template) => {
    const newValue = template.is_active ? 0 : 1;
    setSaving(template.id);

    const result = await apiRequest<Template>(`/templates/${template.id}`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: newValue }),
    });

    if (result.ok && result.data) {
      setTemplates((prev) => prev.map((t) => (t.id === template.id ? result.data! : t)));
    }
    setSaving(null);
  };

  const hasChanges = (id: string) => edits[id] && Object.keys(edits[id]).length > 0;

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setSaving(id);

    const result = await apiRequest(`/templates/${id}`, { method: 'DELETE' });
    if (result.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success('Template deleted');
    } else {
      toast.error(result.error?.message || 'Failed to delete');
    }
    setSaving(null);
  };

  if (loading) return <LoadingOverlay message="Loading templates..." />;

  return (
    <PageLayout>
    <div style={s.page}>
      <header style={s.header} className="ptowl-header">
        <OwlLogo size="md" linkTo="/" />
        <div style={{ display: 'flex', gap: '0.5rem' }} className="ptowl-header-actions">
          <details style={s.menuRoot} className="ptowl-menu">
            <summary style={s.menuSummary} aria-label="Open profile menu">Profile &#9662;</summary>
            <div style={s.menuPanel} role="menu">
              <button style={s.menuItem} role="menuitem" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button style={s.menuItem} role="menuitem" onClick={() => navigate('/profile')}>Profile &amp; Clinic Info</button>
              <button style={s.menuItem} role="menuitem" onClick={() => navigate('/customize/print')}>Print Settings</button>
              <button style={{ ...s.menuItem, ...s.menuItemDanger }} role="menuitem" onClick={logout}>Sign out</button>
            </div>
          </details>
        </div>
      </header>

      <main id="main-content" style={s.main} className="ptowl-main">
        <h1 style={s.title}>Edit Templates</h1>
        <p style={s.subtitle}>
          Customize your schedule templates. Changes only affect new schedules.
        </p>

        {templates.length === 0 && (
          <div style={s.emptyState} role="status" aria-live="polite">
            <div style={s.emptyIcon} aria-hidden="true">🦉</div>
            <h3 style={s.emptyTitle}>You&apos;ve removed all templates.</h3>
            <p style={s.emptyText}>
              Templates power the dashboard hotkeys (2-6) for one-press schedule creation.
              Email <a href="mailto:help@ptowl.com" style={s.emptyLink}>help@ptowl.com</a> to
              restore the defaults, or use the keyboard wizard (press <kbd style={s.emptyKbd}>1</kbd>
              {' '}on the dashboard) to create custom schedules without a template.
            </p>
          </div>
        )}

        <div style={s.grid} className="template-grid">
          {templates.map((template) => (
            <div
              key={template.id}
              style={{
                ...s.card,
                opacity: template.is_active ? 1 : 0.5,
              }}
            >
              {/* Hotkey badge + active toggle */}
              <div style={s.cardHeader}>
                <span style={s.hotkeyBadge}>{template.hotkey}</span>
                <button
                  style={template.is_active ? s.activeBadge : s.inactiveBadge}
                  onClick={() => handleToggleActive(template)}
                  disabled={saving === template.id}
                >
                  {template.is_active ? 'Active' : 'Inactive'}
                </button>
              </div>

              {/* Name */}
              <label style={s.label}>Name</label>
              <input
                style={s.input}
                value={getEditValue(template.id, 'name') as string}
                onChange={(e) => setEditValue(template.id, 'name', e.target.value)}
                maxLength={100}
              />

              {/* Sessions per week */}
              <div style={s.row}>
                <div style={s.field}>
                  <label style={s.label}>Sessions/Week</label>
                  <select
                    style={s.select}
                    value={getEditValue(template.id, 'sessions_per_week') as number}
                    onChange={(e) => setEditValue(template.id, 'sessions_per_week', Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>{n}x/wk</option>
                    ))}
                  </select>
                </div>

                {/* Duration weeks */}
                <div style={s.field}>
                  <label style={s.label}>Duration</label>
                  <select
                    style={s.select}
                    value={getEditValue(template.id, 'duration_weeks') as number}
                    onChange={(e) => setEditValue(template.id, 'duration_weeks', Number(e.target.value))}
                  >
                    {Array.from({ length: 52 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n} week{n > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Default time */}
              <label style={s.label}>Default Time</label>
              <input
                type="time"
                style={s.input}
                value={getEditValue(template.id, 'default_time') as string}
                onChange={(e) => setEditValue(template.id, 'default_time', e.target.value)}
              />

              {/* Save + Delete buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  style={hasChanges(template.id) ? s.saveBtn : s.saveBtnDisabled}
                  onClick={() => handleSave(template.id)}
                  disabled={!hasChanges(template.id) || saving === template.id}
                >
                  {saving === template.id ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  style={s.deleteBtn}
                  onClick={() => handleDelete(template.id, template.name)}
                  disabled={saving === template.id}
                  aria-label={`Delete template ${template.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
    </PageLayout>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--off-white)' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '1rem 2rem', background: 'var(--white)', borderBottom: '1px solid var(--gray-mid)',
  },
  menuRoot: { position: 'relative' as const },
  menuSummary: { listStyle: 'none' as const, cursor: 'pointer', padding: '0.625rem 1rem', background: 'var(--gray-light)', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--dark)', userSelect: 'none' as const },
  menuPanel: { position: 'absolute' as const, top: 'calc(100% + 0.25rem)', right: 0, minWidth: '12rem', background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--gray-mid)', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: '0.25rem', display: 'flex', flexDirection: 'column' as const, gap: '0.125rem', zIndex: 50 },
  menuItem: { textAlign: 'left' as const, padding: '0.5rem 0.75rem', background: 'transparent', border: 'none', borderRadius: 'var(--radius)', fontSize: '0.875rem', fontWeight: 500, color: 'var(--dark)', cursor: 'pointer' },
  menuItemDanger: { color: 'var(--red-mid)', marginTop: '0.25rem', borderTop: '1px solid var(--gray-mid)', paddingTop: '0.5rem', borderRadius: 0 },
  emptyState: { textAlign: 'center' as const, padding: '3rem 1.5rem', background: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--gray-mid)', marginBottom: '1.5rem' },
  emptyIcon: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  emptyTitle: { fontSize: '1.1rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.5rem' },
  emptyText: { color: 'var(--gray-text)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto' },
  emptyLink: { color: 'var(--green-dark)', fontWeight: 600 },
  emptyKbd: { display: 'inline-block', padding: '0.125rem 0.375rem', background: 'var(--gray-light)', border: '1px solid var(--gray-mid)', borderRadius: '3px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 600 },
  main: { maxWidth: 'clamp(320px, 92vw, 1200px)', margin: '0 auto', padding: '2rem 1.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' },
  subtitle: { color: 'var(--gray-text)', marginBottom: '1.5rem' },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem',
  },
  card: {
    background: 'var(--white)', borderRadius: 'var(--radius-lg)', padding: '1.25rem',
    border: '2px solid var(--gray-mid)', transition: 'border-color 0.2s',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem',
  },
  hotkeyBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', borderRadius: '50%',
    background: 'var(--green-dark)', color: 'white', fontWeight: 700, fontSize: '0.8rem',
    fontFamily: 'var(--font-mono)',
  },
  activeBadge: {
    padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
    background: 'var(--green-light)', color: 'var(--green-dark)', cursor: 'pointer',
  },
  inactiveBadge: {
    padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
    background: 'var(--gray-light)', color: 'var(--gray-text)', cursor: 'pointer',
  },
  label: {
    display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--gray-text)',
    marginBottom: '0.25rem', marginTop: '0.5rem',
  },
  input: {
    width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)',
    border: '1px solid var(--gray-mid)', fontSize: '0.875rem', boxSizing: 'border-box' as const,
  },
  select: {
    width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)',
    border: '1px solid var(--gray-mid)', fontSize: '0.875rem', boxSizing: 'border-box' as const,
    background: 'var(--white)',
  },
  row: { display: 'flex', gap: '0.75rem' },
  field: { flex: 1 },
  saveBtn: {
    width: '100%', marginTop: '0.75rem', padding: '0.5rem',
    background: 'var(--green-mid)', color: 'white', borderRadius: 'var(--radius)',
    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
  },
  saveBtnDisabled: {
    width: '100%', marginTop: '0.75rem', padding: '0.5rem',
    background: 'var(--gray-light)', color: 'var(--gray-text)', borderRadius: 'var(--radius)',
    fontSize: '0.875rem', fontWeight: 500, cursor: 'not-allowed',
  },
  deleteBtn: {
    padding: '0.5rem 0.75rem', marginTop: '0.75rem',
    background: 'var(--red-light)', color: 'var(--red-mid)', borderRadius: 'var(--radius)',
    fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' as const,
  },
};
