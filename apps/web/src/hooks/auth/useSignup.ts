import { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

/**
 * useSignup — wraps Clerk's useSignUp with our form ergonomics.
 *
 * Args to submit:
 *   clinicName — passed as firstName so Clerk stores it; surfaces as
 *                user.display_name through our API provisioning.
 *   email      — login identifier.
 *   password   — Clerk's default password rules apply (>= 8 chars).
 *
 * Behavior: if Clerk completes immediately (email verification turned
 * OFF in dashboard), we set the session active and navigate to /dashboard.
 * AuthContext + provision.ts then handle the pending/approved gate.
 *
 * If Clerk requires verification, the result.status will be
 * 'missing_requirements' — we surface that as a friendly message and
 * let the user retry. (Phase 4 may add a verification UI; for beta we
 * recommend turning verification OFF in Clerk dashboard.)
 */
export function useSignup() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit({
    clinicName,
    email,
    password,
  }: {
    clinicName: string;
    email: string;
    password: string;
  }) {
    if (!isLoaded || !signUp) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName: clinicName,
      });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate('/dashboard');
        return;
      }
      setError(
        'Almost — Clerk needs an extra step. Ask the PTOwl founder to disable email verification in the Clerk dashboard.',
      );
    } catch (err: unknown) {
      setError(mapClerkError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isLoaded, submit, isSubmitting, error };
}

function mapClerkError(err: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  const first = anyErr?.errors?.[0];
  // Defense against the 2026-05-18 user-screenshot incident: when the
  // Clerk dashboard has email auth disabled, signUp.create rejects
  // with code 'form_param_unknown' + a message that includes the raw
  // dashboard URL. Catch that specific shape and render friendly
  // copy so end-users never see Clerk's internal URL. The form-mount
  // probe in SignUpFormPage SHOULD prevent the submit from happening
  // at all (90% of the time), but this is the belt-and-suspenders
  // for when the 60-second strategies cache is stale and a user
  // submits mid-config-change.
  const msg: string = first?.message || first?.longMessage || '';
  if (first?.code === 'form_param_unknown' && /email_address/i.test(msg)) {
    return "Sign-up isn't accepting email accounts right now. Contact help@ptowl.com for assistance.";
  }
  if (first?.longMessage) return first.longMessage;
  if (first?.message) return first.message;
  if (anyErr?.message) return anyErr.message;
  return 'Sign-up failed. Try a different email or check your password.';
}
