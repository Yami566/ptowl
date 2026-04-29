/**
 * Cloudflare Pages Functions Middleware — Edge Authentication Guard
 *
 * Runs on Cloudflare's edge BEFORE any HTML/JS is served.
 * Unauthenticated users hitting protected routes (e.g., /dashboard)
 * receive a 302 redirect — zero application code reaches the browser.
 *
 * Uses native Web Crypto API for JWT verification (zero dependencies).
 * Replicates the same HS256 HMAC-SHA256 verification as the API Worker.
 *
 * Required Pages secret: JWT_SECRET (same value as the API Worker's secret)
 *   Set via: wrangler pages secret put JWT_SECRET --project-name ptowl
 */

interface Env {
  JWT_SECRET: string;
}

interface JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  tier?: string;
  status?: string;
  admin_verified?: boolean;
  iat?: number;
  exp?: number;
}

/** Routes that require an authenticated, approved user */
const PROTECTED_PREFIXES = ['/dashboard', '/schedule', '/customize', '/profile'];

/** Routes accessible without authentication */
const PUBLIC_PATHS = ['/', '/pending', '/privacy', '/terms', '/security'];

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Static assets (JS, CSS, images, fonts) — always pass through
  if (path.startsWith('/assets/') || path.match(/\.\w{2,5}$/)) {
    return context.next();
  }

  // Public routes — pass through
  if (PUBLIC_PATHS.includes(path)) {
    return context.next();
  }

  // Check if this is a protected route
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + '/'),
  );

  if (!isProtected) {
    // Unknown route — let Pages serve it (will be 404 or SPA fallback)
    return context.next();
  }

  // ── Protected route: verify JWT from httpOnly cookie ──

  const secret = context.env.JWT_SECRET;
  if (!secret) {
    // Misconfiguration — fail closed (don't serve protected content)
    console.error('JWT_SECRET not configured in Pages environment');
    return redirectTo(context.request.url, '/');
  }

  const token = getCookie(context.request.headers.get('cookie') || '', 'token');
  if (!token) {
    return redirectTo(context.request.url, '/');
  }

  // Verify JWT signature (allow expired tokens within 14-day refresh window
  // so the client-side refresh flow can issue a new token without a double-redirect)
  const payload = await verifyJWTSignature(token, secret, 14 * 24 * 60 * 60);
  if (!payload) {
    return redirectTo(context.request.url, '/');
  }

  // Signature valid — serve the page
  return context.next();
};

// ── Helpers ──────────────────────────────────────────────────

function redirectTo(requestUrl: string, target: string): Response {
  const url = new URL(target, requestUrl);
  return new Response(null, {
    status: 302,
    headers: { Location: url.toString() },
  });
}

function getCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

/**
 * Verify JWT using native Web Crypto API (HS256 / HMAC-SHA256).
 * Replicates the exact same verification as jose's jwtVerify with HS256.
 *
 * @param token      - The JWT string (header.payload.signature)
 * @param secret     - The shared secret (same as API Worker's JWT_SECRET)
 * @param maxAgeSec  - Max age in seconds to allow expired tokens (for refresh window)
 * @returns Decoded payload if signature is valid, null otherwise
 */
async function verifyJWTSignature(
  token: string,
  secret: string,
  maxAgeSec: number,
): Promise<JWTPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    // 1. Verify the header specifies HS256 (prevent algorithm-switching attacks)
    const header = JSON.parse(base64UrlDecodeString(parts[0]!));
    if (header.alg !== 'HS256') return null;

    // 2. Import the HMAC key
    const keyData = new TextEncoder().encode(secret);
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    // 3. Verify the signature
    const signatureInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = base64UrlDecodeBytes(parts[2]!);
    const valid = await crypto.subtle.verify('HMAC', key, signature, signatureInput);
    if (!valid) return null;

    // 4. Parse payload
    const payload: JWTPayload = JSON.parse(base64UrlDecodeString(parts[1]!));

    // 5. Check expiration (with tolerance for refresh window)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now - payload.exp > maxAgeSec) {
      return null; // Token is expired beyond the refresh window
    }

    // 6. Check issued-at isn't in the future (clock skew tolerance: 60s)
    if (payload.iat && payload.iat > now + 60) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function base64UrlDecodeString(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(base64 + padding);
}

function base64UrlDecodeBytes(str: string): Uint8Array {
  const binary = base64UrlDecodeString(str);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
