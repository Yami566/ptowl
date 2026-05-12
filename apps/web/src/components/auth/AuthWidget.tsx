/**
 * Auth widget rendered on the landing page.
 *
 * Same-origin anchor tags pointing at /accounts/sign-in and
 * /accounts/sign-up, which mount Clerk's full <SignIn> / <SignUp>
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
 *     pinned to /accounts/sign-in and /accounts/sign-up so signed-out
 *     redirects land on these paths.
 *   - apps/web/src/App.tsx — wildcard routes /accounts/sign-in/*
 *     and /accounts/sign-up/* so Clerk's internal step routing
 *     (factor-one, verify-email) resolves under the mount path.
 *   - Clerk dashboard — Sign-in URL / Sign-up URL / After sign-in URL
 *     must be updated to ptowl.com/accounts/sign-in etc. once this
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
      <a href="/accounts/sign-in" style={primaryStyles}>
        <GoogleGIcon />
        <span>Sign in</span>
      </a>
      <a href="/accounts/sign-up" style={secondaryStyles}>
        Create an account
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

/**
 * Google "G" mark — official 4-color SVG. Free to use per Google's brand
 * guidelines for "Sign in with Google" and similar surfaces. Sized to
 * match the 1rem button text. White rounded background ensures visibility
 * on the green primary button.
 */
function GoogleGIcon() {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '20px',
        height: '20px',
        background: 'white',
        borderRadius: '50%',
        flexShrink: 0,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
        />
      </svg>
    </span>
  );
}

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
