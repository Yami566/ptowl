/**
 * AES-GCM encryption for patient emails at rest.
 *
 * Workers don't have a great in-memory secret-store, so we use a single
 * 256-bit key supplied via the EMAIL_ENCRYPTION_KEY env var (base64-
 * encoded 32 bytes). The same key encrypts and decrypts.
 *
 * Storage format (single string):
 *   <iv-base64>.<ciphertext-and-tag-base64>
 *
 * Generate a key locally:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
 *
 * Set as a worker secret:
 *   wrangler secret put EMAIL_ENCRYPTION_KEY
 */

async function importKey(rawKey: string): Promise<CryptoKey> {
  const raw = base64Decode(rawKey);
  if (raw.length !== 32) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be 32 bytes (base64-encoded)');
  }
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptEmail(plaintext: string, rawKey: string): Promise<string> {
  const key = await importKey(rawKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return `${base64Encode(iv)}.${base64Encode(new Uint8Array(ciphertext))}`;
}

export async function decryptEmail(stored: string, rawKey: string): Promise<string> {
  const [ivB64, ctB64] = stored.split('.');
  if (!ivB64 || !ctB64) throw new Error('Malformed encrypted email');
  const iv = base64Decode(ivB64);
  const ciphertext = base64Decode(ctB64);
  const key = await importKey(rawKey);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

/**
 * Stable hash of a normalized email — used as the lookup key in the
 * email_subscriptions table and as the public identifier embedded in
 * unsubscribe tokens. Hashing prevents leaking the email through DB
 * dumps and decouples unsub state from the encrypted-at-rest payload.
 */
export async function hashEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const encoded = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
