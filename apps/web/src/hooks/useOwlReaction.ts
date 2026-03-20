import { useCallback } from 'react';
import type { OwlVariant } from './useOwlVariant.js';

/**
 * useOwlReaction — trigger contextual owl "O" animations in response to app events.
 *
 * The owl spins on schedule creation, glows on save, shakes on error, etc.
 * Dispatches a CustomEvent that useOwlVariant listens for.
 */
function triggerReaction(variant: OwlVariant) {
  window.dispatchEvent(new CustomEvent('ptowl-owl-reaction', { detail: variant }));
}

export function useOwlReaction() {
  const onScheduleCreated = useCallback(() => triggerReaction('spin'), []);
  const onSaveSuccess = useCallback(() => triggerReaction('glow'), []);
  const onError = useCallback(() => triggerReaction('shake'), []);
  const onPrint = useCallback(() => triggerReaction('bounce'), []);
  const onShare = useCallback(() => triggerReaction('float'), []);
  const onDelete = useCallback(() => triggerReaction('drop'), []);
  const onPageLoad = useCallback(() => triggerReaction('blink'), []);

  return { onScheduleCreated, onSaveSuccess, onError, onPrint, onShare, onDelete, onPageLoad, triggerReaction };
}
