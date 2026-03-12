import { useEffect, useRef, useCallback } from 'react';

/**
 * Cloudflare Turnstile widget for bot protection.
 * Loads the Turnstile script once, renders an invisible challenge,
 * and calls onToken with the verification token on success.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'compact' | 'invisible';
          appearance?: 'always' | 'execute' | 'interaction-only';
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

// Track script loading state globally (shared across all widget instances)
let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadTurnstileScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();

  return new Promise((resolve) => {
    if (scriptLoading) {
      loadCallbacks.push(resolve);
      return;
    }

    scriptLoading = true;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      scriptLoading = false;
      resolve();
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    script.onerror = () => {
      scriptLoading = false;
      // Still resolve — widget will fail gracefully (server skips if no secret configured)
      resolve();
    };
    document.head.appendChild(script);
  });
}

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA';

export function TurnstileWidget({ onToken, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const handleToken = useCallback(
    (token: string) => {
      onToken(token);
    },
    [onToken],
  );

  const handleExpire = useCallback(() => {
    onExpire?.();
    onToken(''); // Clear token on expiry
  }, [onExpire, onToken]);

  const handleError = useCallback(() => {
    onError?.();
  }, [onError]);

  useEffect(() => {
    let mounted = true;

    loadTurnstileScript().then(() => {
      if (!mounted || !containerRef.current || !window.turnstile) return;

      // Clean up any existing widget
      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        callback: handleToken,
        'expired-callback': handleExpire,
        'error-callback': handleError,
        theme: 'light',
        appearance: 'interaction-only',
      });
    });

    return () => {
      mounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
    };
  }, [handleToken, handleExpire, handleError]);

  return <div ref={containerRef} style={{ minHeight: '0' }} />;
}
