const API_BASE = '/api/v1';

// Hard request timeout. AuthProvider blocks rendering on the initial
// /auth/refresh fetch; without a timeout, an API outage (or a reverse-
// proxy hang) freezes the SPA on "Verifying session..." for ~30s.
// 8s is generous for a healthy worker (P99 < 200ms typical) and short
// enough that public pages stay responsive when the API is degraded.
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

  // CSRF protection is enforced server-side by hono/csrf via Origin/Referer.
  // Browsers automatically send Origin on cross-origin POST/PUT/PATCH/DELETE,
  // so the client doesn't need to attach a token.

  let response: Response;
  try {
    response = await fetchWithTimeout(
      url,
      { ...options, method, headers, credentials: 'include' },
      DEFAULT_TIMEOUT_MS,
    );
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

  // Handle 401 — try refresh (skip for auth status checks and auth endpoints)
  const skipRefresh = ['/auth/refresh', '/auth/me', '/auth/firebase'];
  if (response.status === 401 && !skipRefresh.some((p) => path.includes(p))) {
    try {
      const refreshResult = await fetchWithTimeout(
        `${API_BASE}/auth/refresh`,
        { method: 'POST', credentials: 'include' },
        DEFAULT_TIMEOUT_MS,
      );

      if (refreshResult.ok) {
        const retryResponse = await fetchWithTimeout(
          url,
          { ...options, method, headers, credentials: 'include' },
          DEFAULT_TIMEOUT_MS,
        );
        return parseResponse<T>(retryResponse);
      }
    } catch {
      // Refresh failed (timeout or network)
    }

    // AuthContext handles redirect to /login via React Router (no hard reload)
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } };
  }

  return parseResponse<T>(response);
}
