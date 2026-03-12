import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword as firebaseSignInEmail,
  createUserWithEmailAndPassword as firebaseCreateUser,
  sendPasswordResetEmail as firebaseSendResetEmail,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';

// Firebase config — values come from environment variables set in .env files.
// The user must create a Firebase project and provide these values.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// ── Google Sign-In ──

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

export async function signInWithGoogle(): Promise<string> {
  const result = await signInWithPopup(auth, googleProvider);
  const idToken = await result.user.getIdToken();
  return idToken;
}

// ── Phone Auth ──

let recaptchaVerifier: RecaptchaVerifier | null = null;

/**
 * Format a phone number to E.164 format required by Firebase.
 * - Strips all non-digit characters
 * - 10 digits → assumes US, prepends +1
 * - 11 digits starting with 1 → prepends +
 * - Already starts with + → pass through
 */
function formatPhoneE164(phone: string): string {
  // If already has +, just strip non-digit/non-plus chars
  if (phone.startsWith('+')) {
    return '+' + phone.slice(1).replace(/\D/g, '');
  }

  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    // US number without country code
    return '+1' + digits;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    // US number with leading 1
    return '+' + digits;
  }

  // Fallback: prepend + and hope for the best
  return '+' + digits;
}

export function initRecaptcha(containerId: string): void {
  if (recaptchaVerifier) return;
  try {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
    });
  } catch (err) {
    console.error('Failed to initialize reCAPTCHA:', err);
    recaptchaVerifier = null;
    throw err;
  }
}

export function resetRecaptcha(): void {
  recaptchaVerifier = null;
}

export async function sendPhoneCode(phoneNumber: string): Promise<ConfirmationResult> {
  if (!recaptchaVerifier) {
    throw new Error('Phone verification not ready. Please refresh the page and try again.');
  }
  const formatted = formatPhoneE164(phoneNumber);
  return signInWithPhoneNumber(auth, formatted, recaptchaVerifier);
}

export async function confirmPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string,
): Promise<string> {
  const result = await confirmationResult.confirm(code);
  const idToken = await result.user.getIdToken();
  return idToken;
}

// ── Email/Password Auth (via Firebase) ──

/**
 * Sign in with email and password through Firebase.
 * Returns the Firebase ID token for backend exchange.
 */
export async function signInWithEmail(email: string, password: string): Promise<string> {
  const result = await firebaseSignInEmail(auth, email, password);
  const idToken = await result.user.getIdToken();
  return idToken;
}

/**
 * Register a new user with email and password through Firebase.
 * Optionally sets display name on the Firebase profile.
 * Returns the Firebase ID token for backend exchange.
 */
export async function registerWithEmail(
  email: string,
  password: string,
  displayName?: string,
): Promise<string> {
  const result = await firebaseCreateUser(auth, email, password);
  if (displayName) {
    await updateProfile(result.user, { displayName });
  }
  const idToken = await result.user.getIdToken();
  return idToken;
}

/**
 * Send a password reset email through Firebase.
 * Firebase handles the entire reset flow — no custom backend needed.
 */
export async function sendPasswordReset(email: string): Promise<void> {
  await firebaseSendResetEmail(auth, email);
}

// ── Sign out ──

export async function firebaseSignOut(): Promise<void> {
  await auth.signOut();
}
