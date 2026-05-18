import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

/**
 * useLogin — wraps Clerk's useSignIn with our form ergonomics.
 *
 * Returns:
 *   isLoaded     — Clerk SDK readiness; until true, treat as loading.
 *   submit       — call with { email, password } to attempt sign-in.
 *   isSubmitting — true while the Clerk roundtrip is in flight.
 *   error        — null or a user-friendly error message.
 *
 * Side effect: on `result.status === 'complete'`, sets the session active
 * and navigates to `/dashboard`. Caller doesn't need to handle redirect.
 */
export function useLogin() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit({ email, password }: { email: string; password: string }) {
    if (!isLoaded || !signIn) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate('/dashboard');
        return;
      }
      setError('We need a bit more to sign you in. Try again, or reset your password.');
    } catch (err: unknown) {
      setError(mapClerkError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isLoaded, submit, isSubmitting, error };
}

/**
 * Map Clerk's structured errors to a single user-friendly string.
 * Clerk returns `{ errors: [{ code, message, longMessage }, …] }` on
 * the thrown ClerkAPIError. We pick the first message and trim it.
 */
function mapClerkError(err: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyErr = err as any;
  const first = anyErr?.errors?.[0];
  if (first?.longMessage) return first.longMessage;
  if (first?.message) return first.message;
  if (anyErr?.message) return anyErr.message;
  return 'Sign-in failed. Check your email and password.';
}
