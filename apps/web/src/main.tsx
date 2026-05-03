import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App.js';
import './styles/globals.css';
import './styles/responsive.css';
import './styles/dark-theme.css';

// Clerk publishable key — read at build time by Vite from
// VITE_CLERK_PUBLISHABLE_KEY (set in Cloudflare Workers Builds
// "Variables and Secrets" -> "Production"). When the var is unset
// we render the app WITHOUT ClerkProvider, so the existing Firebase
// flow continues to work and only the /clerk-test route shows an
// error. This makes the Clerk migration safe to land before the
// env var is configured.
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

// SECURITY: Disable React DevTools in production
if (import.meta.env.PROD) {
  const hook = (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (typeof hook === 'object' && hook !== null) {
    for (const key of Object.keys(hook)) {
      if (typeof (hook as Record<string, unknown>)[key] === 'function') {
        (hook as Record<string, unknown>)[key] = () => {};
      }
    }
  }
}

// Register the service worker (production only) — required for the
// "Add to Home Screen" PWA install flow on iOS + Android.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration is best-effort; failures don't break the app.
    });
  });
}

const root = (
  <React.StrictMode>
    {CLERK_PUBLISHABLE_KEY ? (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
);

ReactDOM.createRoot(document.getElementById('root')!).render(root);
