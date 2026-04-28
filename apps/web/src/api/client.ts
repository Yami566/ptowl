import { getFirebaseIdToken } from '../firebase.js';

const API_BASE = '/api/v1';

// Hard request timeout. Without one, an API outage would freeze the
// SPA on auth flows for tens of seconds. 8s is generous for a healthy
// Worker (P99 < 200 ms typical) and short enough that public pages
// stay responsive when the API is degraded.
const DEFAULT_TIMEOUT_MS = 8_000;

type ApiResult<T> = {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { page: number; limit: number; total: number };
};

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
  try {
    const text = await response.text();
    if (!text) return { ok: response.ok };
    return JSON.parse(text);
  } catch {
    return { ok: false, error: { code: 'PARSE_ERROR', message: 'Invalid server response' } };
  }
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * apiRequest — every API call carries the current Firebase ID token
 * as `Authorization: Bearer ...`. The Firebase SDK auto-refreshes
 * tokens behind the scenes (default 1h lifetime), so the client just
 * asks for a fresh one each time. The Worker verifies against
 * Google's JWKS in apps/api/src/auth/firebase-verify.ts.
 *
 * Replaces the previous httpOnly-cookie + /auth/refresh dance.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResult<T>> {
  const url = `${API_BASE}${path}`;
  const method = options.method || 'GET';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach the Firebase ID token if the user is signed in. Public
  // endpoints (calendar feed, share-token routes) tolerate the absence;
  // protected endpoints reject with 401.
  const idToken = await getFirebaseIdToken().catch(() => null);
  if (idToken) {
    headers['Authorization'] = `Bearer ${idToken}`;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, { ...options, method, headers }, DEFAULT_TIMEOUT_MS);
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === 'AbortError';
    return {
      ok: false,
      error: {
        code: aborted ? 'TIMEOUT' : 'NETWORK_ERROR',
        message: aborted
          ? 'Request timed out. The server may be unreachable.'
          : 'Network error. Check your connection.',
      },
    };
  }

  return parseResponse<T>(response);
}
