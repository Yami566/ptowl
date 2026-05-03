import { SignIn } from '@clerk/clerk-react';

/**
 * Auth widget rendered on the landing page.
 *
 * Despite the legacy filename, this component now renders Clerk's
 * drop-in `<SignIn />` widget. The filename will be renamed to
 * AuthWidget.tsx in a follow-up commit so Phase 2 (backend cutover)
 * can land cleanly without a confusing rename in the same diff.
 *
 * Behavior:
 *   - When VITE_CLERK_PUBLISHABLE_KEY is set in Cloudflare Workers
 *     Builds env, ClerkProvider activates in main.tsx and this
 *     component renders Clerk's hosted sign-in widget.
 *   - When the env var is missing (e.g. mid-deploy), it falls back
 *     to a friendly placeholder so the page never crashes.
 *
 * Phase 2 follow-up will:
 *   - Replace firebase-verify.ts in the API Worker with Clerk JWT
 *     verification so end-to-end sign-in works.
 *   - Remove the Firebase SDK + FirebaseUI dependency from
 *     apps/web/package.json.
 *   - Rename this file to AuthWidget.tsx.
 */
export function FirebaseAuthUI() {
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
