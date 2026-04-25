/**
 * HMAC-signed tokens for one-click unsubscribe links.
 *
 * Embedded in every reminder email as a query string param. The link
 * lands on a public route that verifies the HMAC and toggles the
 * email_subscriptions row keyed by the email hash inside the token.
 *
 * Format: base64url(emailHash:expiresMs:hmac)
 *   - emailHash: SHA-256 hex of normalized email
 *   - expiresMs: epoch millis after which the link is invalid
 *   - hmac: HMAC-SHA256 over `emailHash:expiresMs` with JWT_SECRET
 */

const TOKEN_TTL_DAYS = 90;

export async function signUnsubscribeToken(emailHash: string, secret: string): Promise<string> {
  const expires = Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${emailHash}:${expires}`;
  const sig = await hmac(payload, secret);
  return base64UrlEncode(`${payload}:${sig}`);
}

/**
 * Verify token and return the contained emailHash if valid, null otherwise.
 */
export async function verifyUnsubscribeToken(
  token: string,
  secret: string,
): Promise<string | null> {
  try {
    const decoded = base64UrlDecode(token);
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;

    const [emailHash, expiresStr, providedSig] = parts;
    if (!emailHash || !expiresStr || !providedSig) return null;
    if (!/^[0-9a-f]{64}$/.test(emailHash)) return null;

    const expires = parseInt(expiresStr, 10);
    if (!Number.isFinite(expires)) return null;
    if (Date.now() > expires) return null;

    const expectedSig = await hmac(`${emailHash}:${expires}`, secret);
    if (!constantTimeEqual(expectedSig, providedSig)) return null;

    return emailHash;
  } catch {
    return null;
  }
}

async function hmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i]! ^ bBytes[i]!;
  return diff === 0;
}

function base64UrlEncode(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): string {
  return atob(s.replace(/-/g, '+').replace(/_/g, '/'));
}
