// CSRF token generation and verification using signed double-submit pattern
// H9 FIX: Token format: randomHex.timestamp.hmacHex (timestamp prevents eternal reuse)
// The HMAC binds the token to a specific user + time window

export async function generateSignedCSRFToken(secret: string, userId: string): Promise<string> {
  const random = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const timestamp = Math.floor(Date.now() / 1000);
  const hmac = await computeHMAC(`${random}:${userId}:${timestamp}`, secret);
  return `${random}.${timestamp}.${hmac}`;
}

export async function verifyCSRFToken(
  token: string,
  secret: string,
  userId: string,
  maxAgeSeconds: number = 86400, // 24 hours default
): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');

  // Support new timestamped format: random.timestamp.hmac
  if (parts.length === 3) {
    const [random, timestampStr, providedHmac] = parts;
    if (!random || random.length < 32 || !timestampStr || !providedHmac) return false;

    const timestamp = parseInt(timestampStr, 10);
    if (isNaN(timestamp)) return false;

    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > maxAgeSeconds) return false;

    const expectedHmac = await computeHMAC(`${random}:${userId}:${timestamp}`, secret);
    return constantTimeEqual(expectedHmac, providedHmac);
  }

  // Legacy 2-part format: random.hmac (backwards compatibility during rollout)
  if (parts.length === 2) {
    const [random, providedHmac] = parts;
    if (!random || random.length < 32 || !providedHmac) return false;
    const expectedHmac = await computeHMAC(`${random}:${userId}`, secret);
    return constantTimeEqual(expectedHmac, providedHmac);
  }

  return false;
}

/** Constant-time string comparison to prevent timing attacks */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i]! ^ bBytes[i]!;
  }
  return diff === 0;
}

async function computeHMAC(data: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
