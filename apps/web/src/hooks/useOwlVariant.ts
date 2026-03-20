/**
 * useOwlVariant — picks which PTOWL "O" animation to show.
 *
 * Selection logic (in priority order):
 *   1. Easter egg override (event-driven, e.g. clicking "Report Bug")
 *   2. Seasonal override (Halloween, Christmas, Friday the 13th)
 *   3. Random per instance — every OwlLogo mount picks a random variant
 *      from all 15. Navigate to a new page? New random pick.
 *      15 variants = 15^n permutations across n logos on screen.
 *
 * Mobile behavior (<=768px):
 *   Cycles through ALL 15 variants, each playing for 3 seconds,
 *   creating a "showcase" effect. Listens for viewport changes
 *   (e.g. tablet rotation) to start/stop cycling automatically.
 *
 * Fires 'ptowl-easter-egg' CustomEvent to trigger one-shot easter eggs
 * from anywhere:  window.dispatchEvent(new CustomEvent('ptowl-easter-egg', { detail: 'red-eyes' }))
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export const OWL_VARIANTS = [
  'spin',
  'blink',
  'glow',
  'wobble',
  'bounce',
  'double-take',
  'peek',
  'flip',
  'shake',
  'float',
  'color-shift',
  'pendulum',
  'dizzy',
  'typewriter',
  'drop',
] as const;

export type OwlVariant = (typeof OWL_VARIANTS)[number];
export type OwlEasterEgg = 'red-eyes' | 'halloween' | 'christmas';

/** Human-readable descriptions for each variant (for presenting to user) */
export const OWL_VARIANT_DESCRIPTIONS: Record<OwlVariant, string> = {
  'spin':        '270\u00B0 head turn \u2014 the classic owl move',
  'blink':       'Squashes vertically like closing owl eyes',
  'glow':        'Pulsing orange aura like eyes in the dark',
  'wobble':      'Tilts left-right like a curious head bob',
  'bounce':      'Small hop like an excited perched owl',
  'double-take': 'Quick 90\u00B0 glance, then full 270\u00B0 turn',
  'peek':        'Puffs up and shrinks (startled owl)',
  'flip':        '3D backflip like spinning on a branch',
  'shake':       'Rapid jitter like an irritated owl',
  'float':       'Gentle drift like silent flight',
  'color-shift': 'Cycles through warm amber/orange tones',
  'pendulum':    'Swings from top like looking left-right',
  'dizzy':       'Full 360\u00B0 spin with overshoot',
  'typewriter':  'Blinks in/out like being typed into existence',
  'drop':        'Falls down then bounces back (landing on branch)',
};

/** Pick a random variant — avoids repeating the previous one */
function getRandomVariant(exclude?: OwlVariant): OwlVariant {
  let next: OwlVariant;
  do {
    next = OWL_VARIANTS[Math.floor(Math.random() * OWL_VARIANTS.length)];
  } while (next === exclude && OWL_VARIANTS.length > 1);
  return next;
}

/** Check for seasonal easter eggs */
function getSeasonalEasterEgg(): OwlEasterEgg | null {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();
  const dayOfWeek = now.getDay(); // 0=Sun

  // Halloween: Oct 25 - Oct 31
  if (month === 9 && day >= 25) return 'halloween';

  // Christmas / holidays: Dec 20 - Dec 31
  if (month === 11 && day >= 20) return 'christmas';

  // Friday the 13th
  if (dayOfWeek === 5 && day === 13) return 'red-eyes';

  return null;
}

/** Convert variant or easter egg to CSS class name */
export function owlClassName(variant: OwlVariant, easterEgg: OwlEasterEgg | null): string {
  if (easterEgg) return `ptowl-o-${easterEgg}`;
  return `ptowl-o-${variant}`;
}

const MOBILE_QUERY = '(max-width: 768px)';
const MOBILE_CYCLE_MS = 3000;

/**
 * Main hook: returns the current CSS class for the "O" animation.
 *
 * Listens for 'ptowl-easter-egg' events to trigger one-shot overrides
 * (e.g. red-eyes for "Report Bug" click). One-shots auto-clear after 4s.
 *
 * On mobile (<=768px): cycles through random variants every 3s.
 */
export function useOwlVariant(): {
  className: string;
  variant: OwlVariant;
  easterEgg: OwlEasterEgg | null;
  triggerEasterEgg: (egg: OwlEasterEgg) => void;
} {
  const [randomVariant, setRandomVariant] = useState<OwlVariant>(() => getRandomVariant());
  const [seasonalEgg] = useState<OwlEasterEgg | null>(getSeasonalEasterEgg);
  const [activeEgg, setActiveEgg] = useState<OwlEasterEgg | null>(null);
  const variantRef = useRef(randomVariant);

  // Keep ref in sync so the interval callback always has the latest variant
  variantRef.current = randomVariant;

  const triggerEasterEgg = useCallback((egg: OwlEasterEgg) => {
    setActiveEgg(egg);
    // One-shot eggs auto-clear (red-eyes = 4s, others persist)
    if (egg === 'red-eyes') {
      setTimeout(() => setActiveEgg(null), 4000);
    }
  }, []);

  // Listen for global easter egg events
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<OwlEasterEgg>).detail;
      if (detail) triggerEasterEgg(detail);
    };
    window.addEventListener('ptowl-easter-egg', handler);
    return () => window.removeEventListener('ptowl-easter-egg', handler);
  }, [triggerEasterEgg]);

  // Listen for contextual reaction events (temporary variant override)
  useEffect(() => {
    const handler = (e: Event) => {
      const variant = (e as CustomEvent<OwlVariant>).detail;
      if (variant && OWL_VARIANTS.includes(variant)) {
        setRandomVariant(variant);
      }
    };
    window.addEventListener('ptowl-owl-reaction', handler);
    return () => window.removeEventListener('ptowl-owl-reaction', handler);
  }, []);

  // Mobile 3s cycling: cycle through all variants on mobile viewports
  useEffect(() => {
    // SSR guard
    if (typeof window === 'undefined') return;

    const mql = window.matchMedia(MOBILE_QUERY);
    let intervalId: ReturnType<typeof setInterval> | null = null;

    function startCycling() {
      if (intervalId) return;
      intervalId = setInterval(() => {
        const next = getRandomVariant(variantRef.current);
        setRandomVariant(next);
      }, MOBILE_CYCLE_MS);
    }

    function stopCycling() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    // Start or stop based on current viewport
    if (mql.matches) startCycling();

    // Listen for viewport changes (e.g. tablet rotation)
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) startCycling();
      else stopCycling();
    };
    mql.addEventListener('change', onChange);

    return () => {
      stopCycling();
      mql.removeEventListener('change', onChange);
    };
  }, []);

  // Priority: active one-shot egg > seasonal egg > random variant
  const currentEgg = activeEgg || seasonalEgg;

  return {
    className: owlClassName(randomVariant, currentEgg),
    variant: randomVariant,
    easterEgg: currentEgg,
    triggerEasterEgg,
  };
}
