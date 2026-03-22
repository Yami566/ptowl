import { useState, useEffect } from 'react';

/**
 * Persistent banner shown when the user loses internet connectivity.
 * Auto-hides when connection is restored.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        padding: '0.625rem 1rem',
        background: '#DC2626',
        color: 'white',
        textAlign: 'center',
        fontSize: '0.875rem',
        fontWeight: 600,
      }}
    >
      You're offline. Some features may not work until you reconnect.
    </div>
  );
}
