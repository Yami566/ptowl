/**
 * In-memory sliding-window rate limiter for Cloudflare Workers.
 *
 * Uses a global Map keyed by IP:prefix. Each entry stores timestamps
 * of recent requests within the window. Entries auto-expire on check.
 *
 * NOTE: Each Worker isolate has its own memory, so rate limits are
 * per-isolate (not globally coordinated). This is sufficient for
 * preventing brute-force attacks in practice because Cloudflare
 * typically routes the same client IP to the same isolate.
 *
 * For stricter global rate limiting, upgrade to Cloudflare's
 * native Rate Limiting rules (WAF) or use KV/Durable Objects.
 */

import { createMiddleware } from 'hono/factory';
import type { Env } from '../types/env.js';

interface RateLimitOptions {
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
  /** Max requests per window per IP (default: 10) */
  max?: number;
  /** Key prefix to namespace different rate limits */
  keyPrefix?: string;
}

// Global store — persists across requests within the same Worker isolate
const store = new Map<string, number[]>();

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 300_000;

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;

  for (const [key, timestamps] of store.entries()) {
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) {
      store.delete(key);
    } else {
      store.set(key, valid);
    }
  }
}

export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs || 60_000;
  const max = options.max || 10;
  const prefix = options.keyPrefix || 'default';

  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    // Only rate-limit POST (login/register attempts)
    if (c.req.method !== 'POST') {
      return next();
    }

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-real-ip') || 'unknown';
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    // Get existing timestamps, filter to current window
    const timestamps = (store.get(key) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= max) {
      const retryAfter = Math.ceil((timestamps[0] + windowMs - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          ok: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
        },
        429,
      );
    }

    // Record this request
    timestamps.push(now);
    store.set(key, timestamps);

    // Periodic cleanup
    cleanup(windowMs);

    await next();
  });
}
