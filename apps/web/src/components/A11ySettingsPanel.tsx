import { useEffect, useRef, useState } from 'react';
import { useA11y } from '../contexts/A11yContext.js';

/**
 * Language preference reads / writes localStorage `ptowl-language`.
 * On change, we reload the page so Clerk's <ClerkProvider> picks up
 * the new localization at startup (see apps/web/src/main.tsx). Brief
 * flash but reliable — Clerk's localization prop isn't reactive to
 * mid-session changes.
 */
type Language = 'en' | 'es';
const LANG_STORAGE_KEY = 'ptowl-language';

function readCurrentLanguage(): Language {
  if (typeof window === 'undefined' || !window.localStorage) return 'en';
  const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
  if (stored === 'es') return 'es';
  if (stored === 'en') return 'en';
  // No saved choice — derive from navigator.language (same precedence
  // chain main.tsx uses, so first-visit users see consistent state).
  if (typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('es')) {
    return 'es';
  }
  return 'en';
}

/**
 * A11ySettingsPanel — modal overlay for the accessibility companion.
 * Three independent toggles, each rendered as a radio-style row:
 *
 *   • Text size:  normal / large / huge
 *   • Contrast:   normal / high
 *   • Motion:     normal / reduced
 *
 * The OS-preferences-detected state is surfaced as a small badge ("from
 * your device") so a user who already runs reduced-motion at the OS
 * level understands why it's pre-selected.
 *
 * Keyboard handling: Esc closes; on open, focus moves to the first
 * option. Tab cycles through controls; Shift+Tab goes back. Closing
 * returns focus to the element that opened the panel.
 *
 * Styling lives in styles/a11y.css. This component only owns logic +
 * className composition.
 */
interface A11ySettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function A11ySettingsPanel({ open, onClose }: A11ySettingsPanelProps) {
  const { textScale, contrast, motion, setTextScale, setContrast, setMotion, reset, isFromOS } =
    useA11y();

  const firstFocusableRef = useRef<HTMLButtonElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [language, setLanguageState] = useState<Language>(() => readCurrentLanguage());

  const setLanguage = (next: Language) => {
    if (next === language) return;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LANG_STORAGE_KEY, next);
      }
    } catch {
      // localStorage may be unavailable in private mode; silently
      // skip persistence — the page reload below still picks up the
      // browser default.
    }
    setLanguageState(next);
    // ClerkProvider's localization prop isn't reactive — reload to
    // re-render the root with the new locale bundle.
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  // Remember which element opened the panel so we can return focus on close.
  useEffect(() => {
    if (open) {
      openerRef.current = (document.activeElement as HTMLElement) || null;
      // Defer focus until the modal has rendered.
      const id = window.requestAnimationFrame(() => {
        firstFocusableRef.current?.focus();
      });
      return () => window.cancelAnimationFrame(id);
    }
    if (!open && openerRef.current && typeof openerRef.current.focus === 'function') {
      openerRef.current.focus();
    }
    return undefined;
  }, [open]);

  // Esc to close, while open.
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="ptowl-a11y-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ptowl-a11y-title"
      onClick={(e) => {
        // Click outside the card closes the panel.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="ptowl-a11y-card">
        <h2 id="ptowl-a11y-title">Accessibility</h2>
        <p className="ptowl-a11y-tagline">
          Make PTOwl easier on your eyes, ears, and patience. Your choices stick on this device.
        </p>

        <div className="ptowl-a11y-group" role="radiogroup" aria-labelledby="ptowl-a11y-text-label">
          <div id="ptowl-a11y-text-label" className="ptowl-a11y-group-label">
            Text size
          </div>
          <div className="ptowl-a11y-options">
            <button
              type="button"
              role="radio"
              aria-checked={textScale === 'normal'}
              ref={firstFocusableRef}
              className={`ptowl-a11y-option${textScale === 'normal' ? ' is-active' : ''}`}
              onClick={() => setTextScale('normal')}
            >
              Normal
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={textScale === 'large'}
              className={`ptowl-a11y-option${textScale === 'large' ? ' is-active' : ''}`}
              onClick={() => setTextScale('large')}
            >
              Larger
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={textScale === 'huge'}
              className={`ptowl-a11y-option${textScale === 'huge' ? ' is-active' : ''}`}
              onClick={() => setTextScale('huge')}
            >
              Largest
            </button>
          </div>
        </div>

        <div
          className="ptowl-a11y-group"
          role="radiogroup"
          aria-labelledby="ptowl-a11y-contrast-label"
        >
          <div id="ptowl-a11y-contrast-label" className="ptowl-a11y-group-label">
            Contrast
            {isFromOS.contrast && <span className="ptowl-a11y-os-badge">From your device</span>}
          </div>
          <div className="ptowl-a11y-options">
            <button
              type="button"
              role="radio"
              aria-checked={contrast === 'normal'}
              className={`ptowl-a11y-option${contrast === 'normal' ? ' is-active' : ''}`}
              onClick={() => setContrast('normal')}
            >
              Normal
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={contrast === 'high'}
              className={`ptowl-a11y-option${contrast === 'high' ? ' is-active' : ''}`}
              onClick={() => setContrast('high')}
            >
              High
            </button>
          </div>
        </div>

        <div
          className="ptowl-a11y-group"
          role="radiogroup"
          aria-labelledby="ptowl-a11y-motion-label"
        >
          <div id="ptowl-a11y-motion-label" className="ptowl-a11y-group-label">
            Motion
            {isFromOS.motion && <span className="ptowl-a11y-os-badge">From your device</span>}
          </div>
          <div className="ptowl-a11y-options">
            <button
              type="button"
              role="radio"
              aria-checked={motion === 'normal'}
              className={`ptowl-a11y-option${motion === 'normal' ? ' is-active' : ''}`}
              onClick={() => setMotion('normal')}
            >
              Normal
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={motion === 'reduced'}
              className={`ptowl-a11y-option${motion === 'reduced' ? ' is-active' : ''}`}
              onClick={() => setMotion('reduced')}
            >
              Reduced
            </button>
          </div>
        </div>

        <div className="ptowl-a11y-group" role="radiogroup" aria-labelledby="ptowl-a11y-lang-label">
          <div id="ptowl-a11y-lang-label" className="ptowl-a11y-group-label">
            Language / Idioma
          </div>
          <div className="ptowl-a11y-options">
            <button
              type="button"
              role="radio"
              aria-checked={language === 'en'}
              className={`ptowl-a11y-option${language === 'en' ? ' is-active' : ''}`}
              onClick={() => setLanguage('en')}
            >
              English
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={language === 'es'}
              className={`ptowl-a11y-option${language === 'es' ? ' is-active' : ''}`}
              onClick={() => setLanguage('es')}
            >
              Español
            </button>
          </div>
        </div>

        <div className="ptowl-a11y-actions">
          <button
            type="button"
            className="ptowl-a11y-action ptowl-a11y-action-secondary"
            onClick={reset}
          >
            Reset
          </button>
          <button
            type="button"
            className="ptowl-a11y-action ptowl-a11y-action-primary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
