import { SignInButton, SignUpButton } from '@clerk/clerk-react';

/**
 * Auth widget rendered on the landing page.
 *
 * Renders two redirect-mode Clerk buttons that send the visitor to
 * accounts.ptowl.com (Clerk's hosted Account Portal on our first-party
 * subdomain) for the actual sign-in / sign-up flow. After auth, Clerk
 * sends them back to https://ptowl.com per the after_sign_in_url
 * configured in the Clerk dashboard, where AuthContext forwards them
 * to /dashboard.
 *
 * Why this shape (vs. the prior embedded <SignIn /> widget):
 *   1. The embedded widget pulls additional code chunks from clerk.com
 *      on demand. Privacy-focused ad-blockers (uBlock Origin, Brave
 *      Shields, EasyPrivacy lists) commonly block clerk.com hosts,
 *      which left a blank auth card on the landing page for ~1-3% of
 *      privacy-conscious visitors (notably the HN audience).
 *   2. <SignInButton mode="redirect"> renders directly from the
 *      bundled SDK — no on-demand chunk fetch is required. On click,
 *      the SDK navigates the browser to accounts.ptowl.com which is
 *      a CNAME to Clerk under our zone — first-party from the
 *      browser's perspective, so ad-blockers leave it alone.
 *   3. accounts.ptowl.com hosts the same Clerk auth experience the
 *      embedded widget would have shown. Same providers, same
 *      localization (Welcome back, Doctor Hoo.), same flow.
 *
 * Configuration is owned upstream:
 *   - apps/web/src/main.tsx — ClerkProvider with publishableKey +
 *     localization. Untouched.
 *   - Clerk dashboard — sign_in_url, sign_up_url, after_sign_in_url
 *     already point at accounts.ptowl.com / ptowl.com. Verified via
 *     curl on the public /v1/environment endpoint on 2026-05-06.
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
      <SignInButton mode="redirect">
        <button type="button" style={primaryStyles}>
          Sign in
        </button>
      </SignInButton>
      <SignUpButton mode="redirect">
        <button type="button" style={secondaryStyles}>
          Create an account
        </button>
      </SignUpButton>
      <p style={trustNoteStyles}>Free during beta · No credit card · No PHI stored</p>
    </div>
  );
}

const primaryStyles: React.CSSProperties = {
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
};

const secondaryStyles: React.CSSProperties = {
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
};

const trustNoteStyles: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--gray-text)',
  textAlign: 'center',
  marginTop: '0.5rem',
  lineHeight: 1.5,
};
