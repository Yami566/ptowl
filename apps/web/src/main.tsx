import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App.js';
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
// Replaces the default "Sign in to your application" strings with
// PTowl voice ("Welcome back, Doctor Hoo." / "Pleased to meet you,
// Doctor Hoo." / etc.). Keys are Clerk's standard localization
// shape; any key not specified falls back to Clerk's English
// default. Reference: https://clerk.com/docs/customization/localization
const ptowlClerkLocalization = {
  signIn: {
    start: {
      title: 'Welcome back, Doctor Hoo.',
      subtitle: 'Sign in to print schedules in 5 keypresses.',
      actionText: 'New here?',
      actionLink: 'Make an account',
    },
    password: {
      title: 'Enter your password',
      subtitle: 'Welcome back. We saved your perch.',
    },
    emailCode: {
      title: 'Check your email',
      subtitle: 'A one-time code is on its way.',
    },
    forgotPassword: {
      title: 'Forgot your password?',
      subtitle: 'No judgement. Pick how to reset it.',
    },
    resetPassword: {
      title: 'Set a new password',
      subtitle: 'Make it memorable. Make it weird.',
    },
  },
  signUp: {
    start: {
      title: 'Pleased to meet you, Doctor.',
      subtitle: 'Free during beta. No credit card, ever.',
      actionText: 'Already flying with us?',
      actionLink: 'Sign in',
    },
    emailCode: {
      title: 'Check your email',
      subtitle: 'A one-time code is on its way.',
    },
    continue: {
      title: 'Almost there',
      subtitle: 'A couple more details and you are done.',
    },
  },
  userButton: {
    action__signOut: 'Sign out',
    action__manageAccount: 'Manage account',
  },
  formFieldLabel__emailAddress: 'Email',
  formFieldLabel__password: 'Password',
  formButtonPrimary: 'Continue',
  socialButtonsBlockButton: 'Continue with {{provider|titleize}}',
  dividerText: 'or',
  footerActionLink__useAnotherMethod: 'Try a different way',
  badge__primary: 'Primary',
  badge__verified: 'Verified',
  badge__unverified: 'Unverified',
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {CLERK_PUBLISHABLE_KEY ? (
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        afterSignOutUrl="/"
        localization={ptowlClerkLocalization}
      >
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
