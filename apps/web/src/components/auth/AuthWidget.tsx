/**
 * Auth widget rendered on the landing page.
 *
 * Same-origin anchor tags pointing at /accounts/signin and
 * /accounts/signup, which mount Clerk's full <SignIn> / <SignUp>
 * components inline (see apps/web/src/pages/SignInPage.tsx). The URL
 * bar stays on ptowl.com end-to-end; no third-party domain hop.
 *
 * Why same-origin embedded Clerk (not subdomain redirect, not
 * <SignInButton>):
 *   1. Trust: visitors never leave ptowl.com during auth, which reads
 *      cleaner for a SaaS launch and avoids the "huh, what's
 *      clerk.ptowl.com?" question.
 *   2. Reliability: <SignIn> / <SignUp> are real form components,
 *      not click-handler wrappers. They render inline; ad-blockers
 *      that previously clobbered <SignInButton> have no surface here.
 *   3. Anchors-not-buttons: plain <a href> still works pre-hydration
 *      and survives ad-blockers that touch click handlers.
 *
 * Configuration owned upstream:
 *   - apps/web/src/main.tsx — ClerkProvider with signInUrl/signUpUrl
 *     pinned to /accounts/signin and /accounts/signup so signed-out
 *     redirects land on these paths.
 *   - apps/web/src/App.tsx — wildcard routes /accounts/signin/*
 *     and /accounts/signup/* so Clerk's internal step routing
 *     (factor-one, verify-email) resolves under the mount path.
 *   - Clerk dashboard — Sign-in URL / Sign-up URL / After sign-in URL
 *     must be updated to ptowl.com/accounts/signin etc. once this
 *     ships (one-time user-side task).
 */
export function AuthWidget() {
  return (
    <div
      role="region"
      aria-label="Sign-in"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        alignItems: 'stretch',
        width: '100%',
        maxWidth: '320px',
        margin: '0 auto',
      }}
    >
      {/* Wireframe §4.1 — two-CTA betraiders pattern. Primary CTA
        points at the custom LoginPage (/login), secondary at the
        custom SignUpFormPage (/signup). Pre-PR #60 these pointed at
        /accounts/signin and /accounts/signup which still exist as
        the embedded-Clerk fallback path but are no longer the
        primary human entry. */}
      {/* .ptowl-auth-cta class enables the subtle hover/focus lift
        defined in apps/web/src/styles/globals.css. Inline styles
        still drive the base look (matches the rest of the component);
        the class only adds interactive states the CSS can express
        but inline styles cannot. */}
      <a href="/login" className="ptowl-auth-cta" style={primaryStyles}>
        <span>Log In</span>
      </a>
      <a href="/signup" className="ptowl-auth-cta" style={secondaryStyles}>
        Sign Up
      </a>
      <p style={trustNoteStyles}>Free during beta · No credit card · No PHI stored</p>
    </div>
  );
}

const primaryStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '0.625rem',
  padding: '0.875rem 1.5rem',
  background: 'var(--green-mid)',
  color: 'white',
  border: 'none',
  borderRadius: 'var(--radius)',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
  fontFamily: 'inherit',
  textDecoration: 'none',
  textAlign: 'center',
  boxSizing: 'border-box',
};

const secondaryStyles: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0.875rem 1.5rem',
  background: 'var(--white)',
  color: 'var(--green-dark)',
  border: '1.5px solid var(--green-mid)',
  borderRadius: 'var(--radius)',
  fontSize: '1rem',
  fontWeight: 600,
  cursor: 'pointer',
  width: '100%',
  fontFamily: 'inherit',
  textDecoration: 'none',
  textAlign: 'center',
  boxSizing: 'border-box',
};

const trustNoteStyles: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--gray-text)',
  textAlign: 'center',
  marginTop: '0.5rem',
  lineHeight: 1.5,
};
