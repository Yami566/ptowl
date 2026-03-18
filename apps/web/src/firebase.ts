import { initializeApp } from 'firebase/app';
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  multiFactor,
  getMultiFactorResolver,
  type ConfirmationResult,
  type MultiFactorResolver,
  type MultiFactorError,
} from 'firebase/auth';
export type { ConfirmationResult, MultiFactorResolver, MultiFactorError } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDrV20McvFOj14RwdXR533IS2XHkpwyxfw',
  authDomain: 'ptowl-bdfbe.firebaseapp.com',
  projectId: 'ptowl-bdfbe',
  storageBucket: 'ptowl-bdfbe.firebasestorage.app',
  messagingSenderId: '863209879730',
  appId: '1:863209879730:web:12a01e41fb166a2bef31ab',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ── reCAPTCHA ──────────────────────────────────────────────────

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear(); } catch { /* already cleared */ }
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  return recaptchaVerifier;
}

// ── Primary Phone Auth ─────────────────────────────────────────

export async function sendPhoneCode(phone: string, containerId: string): Promise<ConfirmationResult> {
  const verifier = getRecaptchaVerifier(containerId);
  return signInWithPhoneNumber(auth, phone, verifier);
}

export async function getFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// ── MFA: Sign-in with second factor ────────────────────────────

/** Check if a caught error is an MFA challenge */
export function isMFAError(err: unknown): err is MultiFactorError {
  return (err as { code?: string })?.code === 'auth/multi-factor-auth-required';
}

/** Step 1: Send SMS to the enrolled MFA phone during sign-in */
export async function startMFASignIn(
  error: MultiFactorError,
  containerId: string,
): Promise<{ resolver: MultiFactorResolver; verificationId: string }> {
  const resolver = getMultiFactorResolver(auth, error);

  // Find the phone factor hint
  const phoneHint = resolver.hints.find(
    (h) => h.factorId === PhoneMultiFactorGenerator.FACTOR_ID,
  );
  if (!phoneHint) throw new Error('No phone factor enrolled');

  const phoneAuthProvider = new PhoneAuthProvider(auth);
  const verifier = getRecaptchaVerifier(containerId);
  const verificationId = await phoneAuthProvider.verifyPhoneNumber(
    { multiFactorHint: phoneHint, session: resolver.session },
    verifier,
  );

  return { resolver, verificationId };
}

/** Step 2: Complete MFA sign-in with the verification code */
export async function completeMFASignIn(
  resolver: MultiFactorResolver,
  verificationId: string,
  code: string,
) {
  const cred = PhoneAuthProvider.credential(verificationId, code);
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  return resolver.resolveSignIn(assertion);
}

// ── MFA: Enrollment ────────────────────────────────────────────

/** Step 1: Start enrolling a second phone number for MFA */
export async function startMFAEnrollment(
  phoneNumber: string,
  containerId: string,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const session = await multiFactor(user).getSession();
  const phoneAuthProvider = new PhoneAuthProvider(auth);
  const verifier = getRecaptchaVerifier(containerId);

  const verificationId = await phoneAuthProvider.verifyPhoneNumber(
    { phoneNumber, session },
    verifier,
  );

  return verificationId;
}

/** Step 2: Finalize MFA enrollment with the verification code */
export async function finalizeMFAEnrollment(
  verificationId: string,
  code: string,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const cred = PhoneAuthProvider.credential(verificationId, code);
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  await multiFactor(user).enroll(assertion, 'SMS');
}

/** Check if the current user has MFA enrolled */
export function getMFAStatus(): { enrolled: boolean; phoneHint?: string } {
  const user = auth.currentUser;
  if (!user) return { enrolled: false };

  const factors = multiFactor(user).enrolledFactors;
  if (factors.length === 0) return { enrolled: false };

  // Get the masked phone number from the first factor
  const phoneFactor = factors[0];
  return {
    enrolled: true,
    phoneHint: (phoneFactor as { phoneNumber?: string })?.phoneNumber || 'enrolled',
  };
}

/** Unenroll MFA (remove the first enrolled factor) */
export async function unenrollMFA(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const factors = multiFactor(user).enrolledFactors;
  if (factors.length > 0) {
    await multiFactor(user).unenroll(factors[0]!);
  }
}
