import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.js';
import { useTheme } from '../hooks/useTheme.js';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onShowShortcuts: () => void;
}

export function CommandPalette({ open, onOpenChange, onShowShortcuts }: Props) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const go = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const action = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <div style={s.overlay} onClick={() => onOpenChange(false)}>
      <div style={s.container} onClick={(e) => e.stopPropagation()}>
        <Command label="Command palette" style={s.command}>
          <Command.Input
            placeholder="Search pages, actions, shortcuts..."
            style={s.input}
            autoFocus
          />
          <Command.List style={s.list}>
            <Command.Empty style={s.empty}>No results found.</Command.Empty>

            <Command.Group heading="Navigate" style={s.group}>
              <Command.Item onSelect={() => go('/dashboard')} style={s.item}>
                <span style={s.icon}>&#128202;</span> Dashboard
              </Command.Item>
              <Command.Item onSelect={() => go('/profile')} style={s.item}>
                <span style={s.icon}>&#128100;</span> Profile
              </Command.Item>
              <Command.Item onSelect={() => go('/customize')} style={s.item}>
                <span style={s.icon}>&#9881;&#65039;</span> Customize
              </Command.Item>
              <Command.Item onSelect={() => go('/customize/templates')} style={s.item}>
                <span style={s.icon}>&#128196;</span> Templates
              </Command.Item>
              <Command.Item onSelect={() => go('/customize/print')} style={s.item}>
                <span style={s.icon}>&#128424;</span> Print Settings
              </Command.Item>
              {user?.role === 'admin' && (
                <Command.Item onSelect={() => go('/admin')} style={s.item}>
                  <span style={s.icon}>&#128737;&#65039;</span> Admin Panel
                </Command.Item>
              )}
            </Command.Group>

            <Command.Group heading="Quick Actions" style={s.group}>
              <Command.Item onSelect={() => action(() => window.print())} style={s.item}>
                <span style={s.icon}>&#128424;</span> Print Current Page
              </Command.Item>
              <Command.Item onSelect={() => action(toggleTheme)} style={s.item}>
                <span style={s.icon}>{theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}</span>
                {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              </Command.Item>
              <Command.Item onSelect={() => { navigator.clipboard.writeText(window.location.href); onOpenChange(false); }} style={s.item}>
                <span style={s.icon}>&#128279;</span> Copy Current URL
              </Command.Item>
              <Command.Item onSelect={() => action(logout)} style={s.item}>
                <span style={s.icon}>&#128682;</span> Log Out
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Help" style={s.group}>
              <Command.Item onSelect={() => action(onShowShortcuts)} style={s.item}>
                <span style={s.icon}>&#9000;&#65039;</span> Keyboard Shortcuts
                <span style={s.shortcut}>?</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
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
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '15vh',
    zIndex: 300,
    padding: '15vh 1rem 1rem',
  },
  container: {
    width: '100%',
    maxWidth: 'min(480px, 90vw)',
  },
  command: {
    background: 'var(--white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
    overflow: 'hidden',
    border: '1px solid var(--gray-mid)',
  },
  input: {
    width: '100%',
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    fontFamily: 'var(--font-body)',
    border: 'none',
    borderBottom: '1px solid var(--gray-light)',
    outline: 'none',
    background: 'transparent',
    color: 'var(--dark)',
    boxSizing: 'border-box' as const,
  },
  list: {
    maxHeight: '320px',
    overflowY: 'auto' as const,
    padding: '0.5rem',
  },
  empty: {
    padding: '1.5rem',
    textAlign: 'center' as const,
    color: 'var(--gray-text)',
    fontSize: '0.85rem',
  },
  group: {
    marginBottom: '0.25rem',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    padding: '0.5rem 0.625rem',
    borderRadius: 'var(--radius)',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: 'var(--dark)',
    userSelect: 'none' as const,
  },
  icon: {
    fontSize: '1rem',
    width: '1.25rem',
    textAlign: 'center' as const,
    flexShrink: 0,
  },
  shortcut: {
    marginLeft: 'auto',
    padding: '0.125rem 0.375rem',
    background: 'var(--gray-light)',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: 'var(--gray-text)',
  },
};
