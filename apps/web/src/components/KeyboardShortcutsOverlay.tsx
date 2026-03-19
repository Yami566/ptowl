import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: 'Ctrl+K', desc: 'Command palette' },
  { keys: '?', desc: 'Keyboard shortcuts' },
  { keys: '1', desc: 'Open schedule wizard' },
  { keys: '2–6', desc: 'Select preset template' },
  { keys: 'Esc', desc: 'Close overlay / wizard' },
  { keys: 'Enter', desc: 'Confirm / advance step' },
  { keys: 'Backspace', desc: 'Go back a step' },
  { keys: 'W / Q', desc: 'Toggle weeks / months' },
];

export function KeyboardShortcutsOverlay({ open, onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      style={s.overlay}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div style={s.modal}>
        <div style={s.header}>
          <h2 style={s.title}>Keyboard Shortcuts</h2>
          <button style={s.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <div style={s.grid}>
          {shortcuts.map((sc) => (
            <div key={sc.keys} style={s.row}>
              <kbd style={s.kbd}>{sc.keys}</kbd>
              <span style={s.desc}>{sc.desc}</span>
            </div>
          ))}
        </div>
        <p style={s.footnote}>
          Shortcuts are disabled when typing in input fields.
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 250,
    padding: '1rem',
  },
  modal: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '420px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--dark)',
    margin: 0,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.5rem',
    color: 'var(--gray-text)',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.375rem 0',
    borderBottom: '1px solid var(--gray-light)',
  },
  kbd: {
    display: 'inline-block',
    minWidth: '80px',
    padding: '0.25rem 0.5rem',
    background: 'var(--gray-light)',
    border: '1px solid var(--gray-mid)',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--dark)',
    textAlign: 'center' as const,
  },
  desc: {
    fontSize: '0.85rem',
    color: 'var(--gray-text)',
  },
  footnote: {
    fontSize: '0.75rem',
    color: 'var(--gray-text)',
    opacity: 0.7,
    marginTop: '0.75rem',
    textAlign: 'center' as const,
  },
};
