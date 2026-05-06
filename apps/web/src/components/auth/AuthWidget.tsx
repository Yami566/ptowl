import { SignIn } from '@clerk/clerk-react';

/**
 * Auth widget rendered on the landing page.
 *
 * Renders Clerk's drop-in `<SignIn />` widget. Renamed from the legacy
 * `FirebaseAuthUI.tsx` filename in May 2026 — the component itself
 * has wrapped Clerk since the Phase 4 migration; only the filename
 * lagged behind.
 *
 * Configuration is owned upstream by `apps/web/src/main.tsx`, which
 * resolves the publishable key from `VITE_CLERK_PUBLISHABLE_KEY`
 * with a baked-in `pk_live_*` fallback so a fresh self-hosted clone
 * works out of the box. By the time React renders this component,
 * `<ClerkProvider>` has already initialized — there's no scenario
 * where Clerk isn't configured, so we render `<SignIn />` directly.
 *
 * Earlier versions of this component also checked
 * `import.meta.env.VITE_CLERK_PUBLISHABLE_KEY` and rendered a
 * "Sign-in is being upgraded" placeholder when missing. That check
 * was removed on 2026-05-05 because it produced a false negative on
 * Cloudflare Pages builds where the env var was unset (causing
 * production sign-in to silently degrade to the placeholder even
 * though the baked-in `pk_live_` fallback was active).
 */
export function AuthWidget() {
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
