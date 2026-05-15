import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

/**
 * A11yContext — accessibility companion settings that propagate via a
 * single body class. Three independent toggles:
 *
 *   • textScale  — 'normal' (1.0) / 'large' (1.25) / 'huge' (1.5)
 *   • contrast   — 'normal' / 'high'
 *   • motion     — 'normal' (animations) / 'reduced' (none)
 *
 * Source of truth precedence on first visit:
 *
 *   1. Saved user choice in localStorage (key: 'ptowl-a11y-v1')
 *   2. OS preferences (prefers-reduced-motion, prefers-contrast)
 *   3. Defaults (normal, normal, normal)
 *
 * Every toggle change persists immediately so a reload restores the
 * user's choice. Body classes are the only side effect — CSS in
 * styles/a11y.css does all the visual work via class-scoped rules.
 *
 * Off-the-shelf classification:
 *   • React hooks                                   — 🟡 stdlib
 *   • window.localStorage                            — 🟡 stdlib
 *   • window.matchMedia (prefers-* media queries)    — 🟡 stdlib
 *   • document.body.classList                        — 🟡 stdlib
 *
 * Zero new npm deps.
 */

export type TextScale = 'normal' | 'large' | 'huge';
export type ContrastMode = 'normal' | 'high';
export type MotionMode = 'normal' | 'reduced';

interface A11ySettings {
  textScale: TextScale;
  contrast: ContrastMode;
  motion: MotionMode;
}

interface A11yContextValue extends A11ySettings {
  setTextScale: (next: TextScale) => void;
  setContrast: (next: ContrastMode) => void;
  setMotion: (next: MotionMode) => void;
  reset: () => void;
  isFromOS: { contrast: boolean; motion: boolean };
}

const STORAGE_KEY = 'ptowl-a11y-v1';

const DEFAULTS: A11ySettings = {
  textScale: 'normal',
  contrast: 'normal',
  motion: 'normal',
};

const A11yContext = createContext<A11yContextValue | null>(null);

function safeReadStorage(): Partial<A11ySettings> | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    return parsed as Partial<A11ySettings>;
  } catch {
    return null;
  }
}

function safeWriteStorage(settings: A11ySettings) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Some browsers in private mode throw — silently ignore.
  }
}

function readOSPreferences(): { contrast: ContrastMode; motion: MotionMode } {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return { contrast: 'normal', motion: 'normal' };
  }
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // prefers-contrast: 'more' is Safari/Chrome syntax. Fallback to 'high' for older browsers.
  const prefersHighContrast =
    window.matchMedia('(prefers-contrast: more)').matches ||
    window.matchMedia('(prefers-contrast: high)').matches;
  return {
    contrast: prefersHighContrast ? 'high' : 'normal',
    motion: prefersReducedMotion ? 'reduced' : 'normal',
  };
}

function applyBodyClasses(settings: A11ySettings) {
  if (typeof document === 'undefined') return;
  const body = document.body;
  body.classList.toggle('ptowl-text-large', settings.textScale === 'large');
  body.classList.toggle('ptowl-text-huge', settings.textScale === 'huge');
  body.classList.toggle('ptowl-contrast-high', settings.contrast === 'high');
  body.classList.toggle('ptowl-motion-reduced', settings.motion === 'reduced');
}

export function A11yProvider({ children }: { children: ReactNode }) {
  const [osPrefs] = useState(() => readOSPreferences());

  const [settings, setSettings] = useState<A11ySettings>(() => {
    const saved = safeReadStorage();
    if (saved) {
      return {
        textScale:
          saved.textScale === 'large' || saved.textScale === 'huge' ? saved.textScale : 'normal',
        contrast: saved.contrast === 'high' ? 'high' : 'normal',
        motion: saved.motion === 'reduced' ? 'reduced' : 'normal',
      };
    }
    // No saved choice — start from OS prefs so a user who runs their
    // whole machine in reduced-motion gets that respected here too.
    return { ...DEFAULTS, ...osPrefs };
  });

  // Apply on mount and on every change.
  useEffect(() => {
    applyBodyClasses(settings);
    safeWriteStorage(settings);
  }, [settings]);

  const setTextScale = useCallback(
    (next: TextScale) => setSettings((prev) => ({ ...prev, textScale: next })),
    [],
  );
  const setContrast = useCallback(
    (next: ContrastMode) => setSettings((prev) => ({ ...prev, contrast: next })),
    [],
  );
  const setMotion = useCallback(
    (next: MotionMode) => setSettings((prev) => ({ ...prev, motion: next })),
    [],
  );
  const reset = useCallback(() => setSettings({ ...DEFAULTS, ...osPrefs }), [osPrefs]);

  const value = useMemo<A11yContextValue>(
    () => ({
      ...settings,
      setTextScale,
      setContrast,
      setMotion,
      reset,
      isFromOS: {
        contrast: settings.contrast === osPrefs.contrast && osPrefs.contrast !== 'normal',
        motion: settings.motion === osPrefs.motion && osPrefs.motion !== 'normal',
      },
    }),
    [settings, setTextScale, setContrast, setMotion, reset, osPrefs],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y(): A11yContextValue {
  const ctx = useContext(A11yContext);
  if (!ctx) {
    // Hard error — A11yProvider must wrap the app. A failure here means
    // a future refactor accidentally removed the provider; better to
    // surface immediately than silently strip a11y support.
    throw new Error('useA11y must be used within A11yProvider');
  }
  return ctx;
}
