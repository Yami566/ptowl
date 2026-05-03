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
        // Google OAuth — primary tile. One-click sign-in, no cross-device
        // handoff problem (popup signs in on the device that opened it).
        // Requires Firebase Console → Authentication → Sign-in method →
        // Google = enabled (with project support email set).
        {
          provider: firebaseCompat.auth.GoogleAuthProvider.PROVIDER_ID,
          scopes: ['profile', 'email'],
          customParameters: { prompt: 'select_account' },
        },
        // Email link (passwordless / magic link) — fallback for users
        // without Google. forceSameDevice: true avoids the silent
        // wrong-device sign-in trap (clicking the link on a phone when
        // the email was requested from a laptop now errors clearly
        // instead of stranding the laptop session).
        //
        // emailLinkSignIn returns the ActionCodeSettings the magic link
        // is built from. url must be in Firebase Authorized Domains
        // (Settings -> Authorized domains). handleCodeInApp must be
        // true per Firebase email-link spec. Landing directly on
        // /dashboard skips the brief homepage flash + AuthContext
        // redirect on success.
        {
          provider: firebaseCompat.auth.EmailAuthProvider.PROVIDER_ID,
          signInMethod: firebaseCompat.auth.EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD,
          forceSameDevice: true,
          requireDisplayName: false,
          emailLinkSignIn: () => ({
            url: 'https://ptowl.com/dashboard',
            handleCodeInApp: true,
          }),
        },
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
