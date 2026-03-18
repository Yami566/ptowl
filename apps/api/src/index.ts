import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './types/env.js';
import { authRoutes } from './routes/auth.js';
import { scheduleRoutes } from './routes/schedules.js';
import { appointmentRoutes } from './routes/appointments.js';
import { templateRoutes } from './routes/templates.js';
import { profileRoutes } from './routes/profile.js';
import { adminRoutes } from './routes/admin.js';
import { aliasRoutes } from './routes/alias.js';
import { calendarRoutes } from './routes/calendar.js';
// Rate limiting moved to Cloudflare WAF Rules (dashboard config, edge-level).
// Custom per-isolate rate limiting was unreliable on distributed Workers.

type Variables = {
  user: { id: string; email: string; role: string; tier: string } | null;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Global middleware ───────────────────────────────────────

// H1 FIX: Strict CORS — no fallback to localhost in production
app.use('*', async (c, next) => {
  const frontendUrl = c.env.FRONTEND_URL;
  if (!frontendUrl) {
    console.error('FRONTEND_URL not configured — rejecting CORS');
    return c.json({ ok: false, error: { code: 'CONFIG_ERROR', message: 'Server misconfigured' } }, 500);
  }
  const corsMiddleware = cors({
    origin: [frontendUrl],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-CSRF-Token'],
    credentials: true,
    maxAge: 86400,
  });
  return corsMiddleware(c, next);
});

// H2 FIX: Block direct Worker URL access in production
app.use('*', async (c, next) => {
  const host = c.req.header('host') || '';
  if (c.env.ENVIRONMENT === 'production' && host.endsWith('.workers.dev')) {
    return c.json({ ok: false, error: { code: 'FORBIDDEN', message: 'Direct access not allowed' } }, 403);
  }
  return next();
});

app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://challenges.cloudflare.com', 'https://apis.google.com', 'https://www.gstatic.com', 'https://www.google.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https://lh3.googleusercontent.com'],
    connectSrc: ["'self'"],
    frameSrc: ["'self'", 'https://challenges.cloudflare.com'],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],       // Block Flash/Java plugin content
    baseUri: ["'self'"],         // Prevent base tag hijacking
    formAction: ["'self'"],      // Restrict form submissions to same origin
  },
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
}));

// Permissions-Policy: restrict browser feature access
// H8 FIX: HSTS header — enforce HTTPS for 2 years with preload
app.use('*', async (c, next) => {
  await next();
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  c.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
});

// M5 FIX: Request body size limit (1MB) to prevent DoS via large payloads
app.use('*', async (c, next) => {
  const contentLength = parseInt(c.req.header('content-length') || '0');
  if (contentLength > 1_048_576) {
    return c.json({ ok: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } }, 413);
  }
  return next();
});

// Health check — DB connectivity for monitoring (no environment info exposed)
app.get('/api/v1/health', async (c) => {
  try {
    const start = Date.now();
    await c.env.DB.prepare('SELECT 1').first();
    const dbLatencyMs = Date.now() - start;
    return c.json({
      ok: true,
      data: {
        status: 'healthy',
        db: { connected: true, latency_ms: dbLatencyMs },
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return c.json({
      ok: false,
      data: {
        status: 'degraded',
        db: { connected: false, latency_ms: -1 },
        timestamp: new Date().toISOString(),
      },
    }, 503);
  }
});

// Mount routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/schedules', scheduleRoutes);
app.route('/api/v1/appointments', appointmentRoutes);
app.route('/api/v1/templates', templateRoutes);
app.route('/api/v1/profile', profileRoutes);
app.route('/api/v1/admin', adminRoutes);
app.route('/api/v1/alias', aliasRoutes);
app.route('/api/v1/cal', calendarRoutes);

// 404 handler
app.notFound((c) => c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));

// Structured error handler — logs JSON for Cloudflare Workers Observability
app.onError((err, c) => {
  const errorInfo = {
    level: 'error',
    message: err instanceof Error ? err.message : 'Unknown error',
    stack: err instanceof Error ? err.stack : undefined,
    path: c.req.path,
    method: c.req.method,
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
    requestId: c.req.header('cf-ray') || crypto.randomUUID(),
  };
  console.error(JSON.stringify(errorInfo));
  return c.json(
    { ok: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    500,
  );
});

// ─── Scheduled cleanup (Cron Trigger) ────────────────────────
// Runs daily at 3 AM UTC — deletes expired tokens and trims audit log
async function cleanupExpiredData(db: D1Database): Promise<void> {
  await db.prepare(
    `DELETE FROM admin_verification_codes WHERE expires_at < datetime('now', '-1 hour')`,
  ).run();
  await db.prepare(
    `DELETE FROM password_reset_tokens WHERE expires_at < datetime('now', '-1 hour')`,
  ).run();
  await db.prepare(
    `DELETE FROM sessions WHERE expires_at < datetime('now')`,
  ).run();
  await db.prepare(
    `DELETE FROM audit_log WHERE created_at < datetime('now', '-90 days')`,
  ).run();
}

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(cleanupExpiredData(env.DB));
  },
};
