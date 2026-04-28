import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

// Google's public JWKS for Firebase ID tokens. createRemoteJWKSet
// caches and lazily refreshes per Worker isolate (the documented
// jose pattern). Keeping the URL outside the function so module-level
// reuse picks up the cache across requests.
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);

export interface FirebaseClaims extends JWTPayload {
  sub: string;
  phone_number?: string;
  email?: string;
  email_verified?: boolean;
  firebase?: {
    identities?: Record<string, unknown>;
    sign_in_provider?: string;
  };
}

/**
 * Verify a Firebase ID token against Google's public JWKS.
 * Returns the claims on success, null on any failure (bad signature,
 * wrong issuer/audience, expired, malformed, JWKS fetch failure).
 */
export async function verifyFirebaseIdToken(
  idToken: string,
  projectId: string,
): Promise<FirebaseClaims | null> {
  try {
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ['RS256'],
    });
    if (!payload.sub) return null;
    return payload as FirebaseClaims;
  } catch {
    return null;
  }
}
