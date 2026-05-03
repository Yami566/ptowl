import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

/**
 * Clerk session token verifier.
 *
 * Clerk issues short-lived session JWTs from `<frontend-api>/.well-known/jwks.json`.
 * The frontend API host is encoded in the publishable key, but we
 * pass it explicitly via env (CLERK_FRONTEND_API_URL) so the Worker
 * never has to decode the key.
 *
 * Default Clerk session JWTs include `sub` (Clerk user ID like
 * `user_2abc...`), `iss`, `azp`, `iat`, `exp`, and `nbf`. They do
 * NOT include email or phone by default — to add those, configure
 * a JWT template in the Clerk dashboard. We do not rely on email/
 * phone in the JWT for this iteration; provisioning uses `sub` as
 * the unique identity.
 */

let cachedJWKS: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedIssuer: string | null = null;

function getJWKS(issuer: string) {
  if (cachedIssuer !== issuer || !cachedJWKS) {
    cachedJWKS = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
    cachedIssuer = issuer;
  }
  return cachedJWKS;
}

export interface ClerkClaims extends JWTPayload {
  sub: string; // Clerk user ID (`user_xxxxxxxx`)
  iss: string; // `https://<frontend-api>.clerk.accounts.dev` (or `https://clerk.<your-domain>` on prod instances)
  azp?: string; // authorized party (origin that initiated sign-in)
}

/**
 * Verify a Clerk session token. Returns the claims on success, null
 * on any failure (bad signature, wrong issuer, expired, malformed,
 * JWKS fetch failure).
 *
 * `expectedIssuer` should be the full URL like
 * `https://ethical-dingo-48.clerk.accounts.dev`.
 */
export async function verifyClerkSessionToken(
  token: string,
  expectedIssuer: string,
): Promise<ClerkClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJWKS(expectedIssuer), {
      issuer: expectedIssuer,
      algorithms: ['RS256'],
    });
    if (!payload.sub) return null;
    return payload as ClerkClaims;
  } catch {
    return null;
  }
}
