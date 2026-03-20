import { useEffect, useRef, useState, useCallback } from 'react';

const IDLE_LIMIT = 28 * 60 * 1000;   // 28 min — show warning
const LOGOUT_LIMIT = 30 * 60 * 1000; // 30 min — force logout
const CHECK_INTERVAL = 10 * 1000;    // check every 10s
const THROTTLE_MS = 30 * 1000;       // throttle activity events to 1 per 30s

interface UseIdleTimeoutReturn {
  showWarning: boolean;
  secondsLeft: number;
  staySignedIn: () => void;
  logoutNow: () => void;
}

export function useIdleTimeout(
  onLogout: () => Promise<void>,
  onRefresh: () => Promise<void>,
  enabled: boolean,
): UseIdleTimeoutReturn {
  const lastActivity = useRef(Date.now());
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);

  // Reset activity timestamp (throttled)
  const lastThrottle = useRef(0);
  const resetActivity = useCallback(() => {
    const now = Date.now();
    if (now - lastThrottle.current < THROTTLE_MS) return;
    lastThrottle.current = now;
    lastActivity.current = now;
    setShowWarning(false);
  }, []);

  // "Stay signed in" button handler
  const staySignedIn = useCallback(() => {
    lastActivity.current = Date.now();
    lastThrottle.current = Date.now();
    setShowWarning(false);
    onRefresh().catch(() => {});
  }, [onRefresh]);

  // "Log out now" button handler
  const logoutNow = useCallback(() => {
    setShowWarning(false);
    onLogout().catch(() => {});
  }, [onLogout]);

  useEffect(() => {
    if (!enabled) return;

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'] as const;
    events.forEach(e => window.addEventListener(e, resetActivity, { passive: true }));

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity.current;

      if (elapsed >= LOGOUT_LIMIT) {
        setShowWarning(false);
        onLogout().catch(() => {});
      } else if (elapsed >= IDLE_LIMIT) {
        setShowWarning(true);
        const remaining = Math.ceil((LOGOUT_LIMIT - elapsed) / 1000);
        setSecondsLeft(Math.max(0, remaining));
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach(e => window.removeEventListener(e, resetActivity));
      clearInterval(interval);
    };
  }, [enabled, resetActivity, onLogout]);

  return { showWarning, secondsLeft, staySignedIn, logoutNow };
}
