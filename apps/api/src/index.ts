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
import { firebaseAuthRoutes } from './routes/firebase-auth.js';
import { rateLimit } from './middleware/rateLimit.js';

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
    connectSrc: ["'self'", 'https://identitytoolkit.googleapis.com', 'https://securetoken.googleapis.com', 'https://www.googleapis.com', 'https://firebaseinstallations.googleapis.com', 'https://content-firebaseappcheck.googleapis.com'],
    frameSrc: ["'self'", 'https://challenges.cloudflare.com', 'https://*.firebaseapp.com', 'https://www.google.com'],
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

// Rate limiting on auth endpoints (per IP)
app.use('/api/v1/auth/refresh', rateLimit({ windowMs: 60_000, max: 20, keyPrefix: 'refresh' }));
app.use('/api/v1/auth/firebase', rateLimit({ windowMs: 60_000, max: 10, keyPrefix: 'firebase' }));
app.use('/api/v1/admin/login', rateLimit({ windowMs: 60_000, max: 5, keyPrefix: 'admin-login' }));
app.use('/api/v1/admin/send-code', rateLimit({ windowMs: 60_000, max: 3, keyPrefix: 'admin-code' }));
app.use('/api/v1/admin/verify-code', rateLimit({ windowMs: 60_000, max: 5, keyPrefix: 'admin-verify' }));

// Health check
app.get('/api/v1/health', (c) => c.json({ ok: true }));

// Mount routes
app.route('/api/v1/auth', authRoutes);
app.route('/api/v1/schedules', scheduleRoutes);
app.route('/api/v1/appointments', appointmentRoutes);
app.route('/api/v1/templates', templateRoutes);
app.route('/api/v1/profile', profileRoutes);
app.route('/api/v1/admin', adminRoutes);
app.route('/api/v1/alias', aliasRoutes);
app.route('/api/v1/auth', firebaseAuthRoutes);

// 404 handler
app.notFound((c) => c.json({ ok: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err instanceof Error ? err.message : 'Unknown error');
  return c.json(
    { ok: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } },
    500,
  );
});

export default app;
