import { useEffect, useRef } from 'react';
import * as firebaseui from 'firebaseui';
import firebaseCompat from 'firebase/compat/app';
import 'firebaseui/dist/firebaseui.css';
import { useAuth } from '../../contexts/AuthContext.js';

/**
 * FirebaseAuthUI — drop-in pre-built sign-in widget from Google.
 *
 * Configuration is declarative: `signInOptions` lists the providers the
 * project has enabled in the Firebase console (Authentication →
 * Sign-in method). The widget renders the right UI for each one,
 * handles SMS OTP / email-link delivery / OAuth popups internally,
 * and surfaces account-linking prompts when an email collides across
 * providers.
 *
 * Documented at https://github.com/firebase/firebaseui-web. The
 * `firebase/compat` import in apps/web/src/firebase.ts is what lets
 * this v6 package work alongside our modular Firebase v12 SDK.
 */
export function FirebaseAuthUI() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { login } = useAuth();

  useEffect(() => {
    if (!containerRef.current) return;

    // Reuse the existing AuthUI singleton if FirebaseUI has been mounted
    // before in this session (e.g., user navigated back to /). new
    // AuthUI() throws if one already exists for the same auth instance.
    const ui =
      firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(firebaseCompat.auth());

    ui.start(containerRef.current, {
      signInFlow: 'popup',
      signInOptions: [
        // Phone — the existing path; new users still see this tile
        {
          provider: firebaseCompat.auth.PhoneAuthProvider.PROVIDER_ID,
          recaptchaParameters: { size: 'invisible' },
          defaultCountry: 'US',
        },
        // Google — enabled in Firebase console
        firebaseCompat.auth.GoogleAuthProvider.PROVIDER_ID,
        // Email-link (passwordless) — enabled in Firebase console
        {
          provider: firebaseCompat.auth.EmailAuthProvider.PROVIDER_ID,
          signInMethod: firebaseCompat.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD,
          forceSameDevice: false,
        },
        // Apple — only renders if enabled in Firebase console (requires
        // an Apple Developer account + Services ID configuration). No
        // harm leaving the entry here when disabled; FirebaseUI just
        // omits the tile.
        'apple.com',
      ],
      tosUrl: '/terms',
      privacyPolicyUrl: '/privacy',
      callbacks: {
        signInSuccessWithAuthResult: () => {
          // Pull the fresh user shape from /auth/me on the next tick
          // (so AuthContext's onAuthStateChanged listener has fired),
          // then return false to prevent the default navigate.
          void login();
          return false;
        },
      },
    });

    return () => {
      // Don't .delete() the singleton — that throws if the user navigates
      // back. ui.reset() clears the rendered widget so it can be
      // re-mounted on next visit.
      try {
        ui.reset();
      } catch {
        /* container may already be unmounted */
      }
    };
  }, [login]);

  return <div ref={containerRef} id="firebaseui-auth-container" />;
}
