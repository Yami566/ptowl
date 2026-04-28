import { initializeApp } from 'firebase/app';
import {
  getAuth,
  indexedDBLocalPersistence,
  setPersistence,
  RecaptchaVerifier,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  multiFactor,
} from 'firebase/auth';

// FirebaseUI Web ships against the v8-style compat surface even though
// we use the modular v9+ API everywhere else. Importing `firebase/compat/*`
// alongside the modular initializeApp registers the same project under
// the compat singleton, which firebaseui consumes via firebase.auth().
// This pattern is documented in the firebaseui-web README under
// "Using FirebaseUI with Firebase 9+ modular SDK".
import firebaseCompat from 'firebase/compat/app';
import 'firebase/compat/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDrV20McvFOj14RwdXR533IS2XHkpwyxfw',
  authDomain: 'ptowl-bdfbe.firebaseapp.com',
  projectId: 'ptowl-bdfbe',
  storageBucket: 'ptowl-bdfbe.firebasestorage.app',
  messagingSenderId: '863209879730',
  appId: '1:863209879730:web:12a01e41fb166a2bef31ab',
};

const app = initializeApp(firebaseConfig);
firebaseCompat.initializeApp(firebaseConfig);
export const auth = getAuth(app);

// IndexedDB persistence is more durable than localStorage in sandboxed
// browser contexts (Safari ITP, iMessage SVC, private mode in some
// browsers). The .catch is required because some contexts throw
// synchronously on storage probe; in that case Firebase falls back to
// in-memory persistence and the user re-auths on next visit.
setPersistence(auth, indexedDBLocalPersistence).catch(() => {});

export async function getFirebaseIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

// ── reCAPTCHA (used by MFA enrollment in ProfilePage) ──────────

let recaptchaVerifier: RecaptchaVerifier | null = null;

function getRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch {
      /* already cleared */
    }
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, containerId, { size: 'invisible' });
  return recaptchaVerifier;
}

// ── MFA Enrollment (sign-in MFA challenge is handled by FirebaseUI) ──

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

export async function finalizeMFAEnrollment(verificationId: string, code: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const cred = PhoneAuthProvider.credential(verificationId, code);
  const assertion = PhoneMultiFactorGenerator.assertion(cred);
  await multiFactor(user).enroll(assertion, 'SMS');
}

export function getMFAStatus(): { enrolled: boolean; phoneHint?: string } {
  const user = auth.currentUser;
  if (!user) return { enrolled: false };

  const factors = multiFactor(user).enrolledFactors;
  if (factors.length === 0) return { enrolled: false };

  const phoneFactor = factors[0];
  return {
    enrolled: true,
    phoneHint: (phoneFactor as { phoneNumber?: string })?.phoneNumber || 'enrolled',
  };
}

export async function unenrollMFA(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not signed in');

  const factors = multiFactor(user).enrolledFactors;
  if (factors.length > 0) {
    await multiFactor(user).unenroll(factors[0]!);
  }
}
