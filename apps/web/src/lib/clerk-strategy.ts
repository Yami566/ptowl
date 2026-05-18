/**
 * apps/web/src/lib/clerk-strategy.ts
 *
 * Fetches Clerk's public /v1/environment endpoint to read the
 * identification strategies the production instance accepts. Used by
 * LoginPage + SignUpFormPage to render a maintenance card when the
 * Clerk dashboard has email auth disabled, instead of letting Clerk's
 * raw "email_address is not a valid parameter" error reach end-users
 * (which is what the user screenshot on 2026-05-18 showed).
 *
 * Mirrors the proven pattern in scripts/e2e-auth.mjs:91-112
 * (detectIdentifierStrategy) but for the browser.
 *
 * Caching: module-level memoization, 60-second TTL. Avoids hammering
 * Clerk's FAPI on every page navigation while still picking up
 * dashboard changes within a minute.
 *
 * Failure handling: fail-OPEN. If the fetch errors or the response is
 * unexpected, we return `supportsEmail: true` so a transient FAPI
 * hiccup doesn't block legitimate signups. The hook-level error
 * mapping in useSignup/useLogin is the belt-and-suspenders that
 * catches any config error that slips past this gate.
 *
 * Off-the-shelf classification:
 *   - Native fetch (browser API)            — standard
 *   - Module-level cache                    — standard React pattern
 *   - Zero npm dependencies
 */

const CLERK_FAPI = 'https://clerk.ptowl.com/v1/environment';
const CACHE_MS = 60_000;

export type StrategiesResult = {
  supportsEmail: boolean;
  supportsPhone: boolean;
  /** The raw strategies list from /v1/environment.auth_config — useful for debugging. */
  strategies: string[];
};

let cached: { at: number; value: StrategiesResult } | null = null;

export async function fetchClerkStrategies(): Promise<StrategiesResult> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_MS) return cached.value;
  try {
    const res = await fetch(CLERK_FAPI, { credentials: 'omit' });
    if (!res.ok) return failOpen();
    const env = (await res.json()) as {
      auth_config?: { identification_strategies?: unknown };
    };
    const raw = env?.auth_config?.identification_strategies;
    const strategies: string[] = Array.isArray(raw)
      ? raw.filter((s): s is string => typeof s === 'string')
      : [];
    const value: StrategiesResult = {
      supportsEmail: strategies.includes('email_address'),
      supportsPhone: strategies.includes('phone_number'),
      strategies,
    };
    cached = { at: now, value };
    return value;
  } catch {
    return failOpen();
  }
}

function failOpen(): StrategiesResult {
  return { supportsEmail: true, supportsPhone: true, strategies: [] };
}

/** Test-only: clear the memoization cache so unit tests can re-stub. */
export function _resetClerkStrategyCache(): void {
  cached = null;
}
