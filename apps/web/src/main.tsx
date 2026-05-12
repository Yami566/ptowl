import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App.js';
import clerkStringsJson from './locale/clerk-strings.json';
import './styles/globals.css';
import './styles/responsive.css';
import './styles/dark-theme.css';

// Clerk publishable key. Designed for browser exposure (it's the
// "publishable" key, not the secret) — pk_* prefixed keys are
// explicitly safe to commit per Clerk's security model:
// https://clerk.com/docs/deployments/overview#publishable-keys
//
// We prefer VITE_CLERK_PUBLISHABLE_KEY from build env when set
// (Cloudflare Workers Builds → Variables → Production), and fall
// back to the baked-in test instance key so the auth widget keeps
// working even if the env var is missing or mid-deploy.
//
// Decoded from base64 the key tells the SDK what Clerk frontend
// API host to talk to: clerk.ptowl.com (production instance,
// promoted from the dev `ethical-dingo-48.clerk.accounts.dev`
// instance on 2026-05-05).
const CLERK_PUBLISHABLE_KEY: string =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined) ||
  'pk_live_Y2xlcmsucHRvd2wuY29tJA';

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

// Clerk localization — owl-themed copy throughout the auth flow.
// Source of truth lives in JSON so non-technical edits don't touch
// code: apps/web/src/locale/clerk-strings.json.
//
// The JSON has a "Welcome back, Doctor {animal}." template plus an
// `_animal_roster` array (Hoo, Vesper, Reed, Glen, Brook, Ember,
// Birch, Cove, Lark, Sage). On each visit we substitute one of the
// names so the sign-in greeting rotates — calming animals + one
// mythical (phoenix as Ember), curated for a therapy-clinic context.
const {
  _animal_roster: animalRoster = ['Hoo'],
  _meta,
  _animal_notes,
  ...clerkStrings
} = clerkStringsJson as Record<string, unknown> & {
  _animal_roster?: string[];
  _meta?: unknown;
  _animal_notes?: unknown;
};
void _meta;
void _animal_notes;

const animal = animalRoster[Math.floor(Math.random() * animalRoster.length)] || 'Hoo';
const ptowlClerkLocalization = JSON.parse(
  JSON.stringify(clerkStrings).replaceAll('{animal}', animal),
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {CLERK_PUBLISHABLE_KEY ? (
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        signInUrl="/accounts/signin"
        signUpUrl="/accounts/signup"
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
        localization={ptowlClerkLocalization}
      >
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
