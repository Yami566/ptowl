const API_BASE = '/api/v1';

let csrfToken: string | null = null;

export function setCSRFToken(token: string) {
  csrfToken = token;
}

export function getCSRFToken(): string | null {
  return csrfToken;
}

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

  // Add CSRF token for state-mutating requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: 'include', // Include httpOnly cookies
    });
  } catch {
    return { ok: false, error: { code: 'NETWORK_ERROR', message: 'Network error. Check your connection.' } };
  }

  // Handle 401 - try refresh (skip for auth status checks and auth endpoints)
  const skipRefresh = ['/auth/refresh', '/auth/me', '/auth/firebase'];
  if (response.status === 401 && !skipRefresh.some((p) => path.includes(p))) {
    try {
      const refreshResult = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      if (refreshResult.ok) {
        const refreshData = await parseResponse<{ csrfToken?: string }>(refreshResult);
        if (refreshData.data?.csrfToken) {
          csrfToken = refreshData.data.csrfToken;
        }
        // Retry original request with new CSRF token
        if (csrfToken && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          headers['X-CSRF-Token'] = csrfToken;
        }
        const retryResponse = await fetch(url, { ...options, method, headers, credentials: 'include' });
        return parseResponse<T>(retryResponse);
      }
    } catch {
      // Refresh failed
    }

    // Refresh failed - clear CSRF and return error
    // AuthContext handles redirect to /login via React Router (no hard reload)
    csrfToken = null;
    return { ok: false, error: { code: 'UNAUTHORIZED', message: 'Session expired' } };
  }

  return parseResponse<T>(response);
}
