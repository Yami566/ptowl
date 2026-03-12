// Verify Firebase ID tokens using jose JWKS
// Works on Cloudflare Workers (no firebase-admin dependency)

import { createRemoteJWKSet, jwtVerify } from 'jose';

const FIREBASE_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

// Cache the JWKS fetcher across requests (module-level singleton)
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));
  }
  return jwks;
}

export interface FirebaseTokenPayload {
  uid: string;
  email?: string;
  phone_number?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  firebase: {
    sign_in_provider: string;
  };
}

export async function verifyFirebaseToken(
  idToken: string,
  projectId: string,
): Promise<FirebaseTokenPayload> {
  const { payload } = await jwtVerify(idToken, getJWKS(), {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const sub = payload.sub;
  if (!sub) {
    throw new Error('Token missing sub claim');
  }

  return {
    uid: sub,
    email: payload.email as string | undefined,
    phone_number: payload.phone_number as string | undefined,
    name: payload.name as string | undefined,
    picture: payload.picture as string | undefined,
    email_verified: payload.email_verified as boolean | undefined,
    firebase: payload.firebase as { sign_in_provider: string },
  };
}
