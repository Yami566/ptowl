// JWT sign/verify using jose library (third-party, industry-standard)
// jose uses HMAC with SHA-256 (HS256) for signing — same security, no custom crypto

import { SignJWT, jwtVerify } from 'jose';

interface JWTPayload {
  sub: string;
  email: string;
  role: string;
  tier: string;
  admin_verified?: boolean;
  iat: number;
  exp: number;
  [key: string]: unknown; // Allow extra claims to pass through
}

/** Encode secret string to Uint8Array for jose HMAC key */
function getSecretKey(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds: number = 900, // 15 minutes
): Promise<string> {
  const key = getSecretKey(secret);

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(key);
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const key = getSecretKey(secret);
    // jose enforces HS256 algorithm check — prevents alg-switching attacks
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });

    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Verify signature but allow expired tokens (for refresh flow)
// maxAgeSeconds limits how old an expired token can be (default 7 days)
export async function verifyJWTAllowExpired(
  token: string,
  secret: string,
  maxAgeSeconds: number = 604800,
): Promise<JWTPayload | null> {
  try {
    const key = getSecretKey(secret);

    // clockTolerance allows jose to accept tokens expired up to maxAgeSeconds ago
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
      clockTolerance: maxAgeSeconds,
    });

    // Additionally verify the token wasn't issued too long ago
    const now = Math.floor(Date.now() / 1000);
    if (payload.iat && now - payload.iat > maxAgeSeconds) return null;

    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
