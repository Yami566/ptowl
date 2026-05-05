import { SignIn } from '@clerk/clerk-react';

/**
 * Auth widget rendered on the landing page.
 *
 * Renders Clerk's drop-in `<SignIn />` widget. Renamed from the legacy
 * `FirebaseAuthUI.tsx` filename in May 2026 — the component itself
 * has wrapped Clerk since the Phase 4 migration; only the filename
 * lagged behind.
 *
 * Behavior:
 *   - When VITE_CLERK_PUBLISHABLE_KEY is set (or the baked fallback
 *     in main.tsx is in use), ClerkProvider activates and this
 *     component renders Clerk's hosted sign-in widget.
 *   - When the env var is missing AND no fallback is baked, falls
 *     back to a friendly placeholder so the page never crashes.
 */
export function AuthWidget() {
  const clerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  if (!clerkConfigured) {
    return (
      <div
        style={{
          padding: '2rem 1rem',
          textAlign: 'center',
          color: 'var(--gray-text)',
          lineHeight: 1.6,
        }}
      >
        <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Sign-in is being upgraded.</p>
        <p style={{ fontSize: '0.85rem' }}>
          PTowl is moving to a faster sign-in. Please check back in a few minutes.
        </p>
      </div>
    );
  }

  // Clerk's hosted sign-in widget. routing="hash" keeps internal
  // navigation in the URL fragment so it doesn't collide with our
  // React Router routes. afterSignInUrl + afterSignUpUrl forward to
  // /dashboard so users land where they expect.
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <SignIn routing="hash" afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard" />
    </div>
  );
}
