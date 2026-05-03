export interface Env {
  // D1 Database binding
  DB: D1Database;

  // R2 binding for clinic logos (optional — falls back to base64-in-D1
  // if the bucket isn't configured yet). Bucket: ptowl-logos.
  LOGOS?: R2Bucket;

  // Cloudflare Queue for outbound reminder emails (optional — cron
  // skips enqueue if the binding isn't configured). Queue: ptowl-reminders.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EMAIL_QUEUE?: Queue<any>;

  // Workers AI binding (optional — used to infer clinic timezone from
  // clinic_address on profile update via @cf/meta/llama-3.1-8b-instruct).
  AI?: Ai;

  // Secrets (set via `wrangler secret put`)
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  EMAIL_API_KEY: string;
  EMAIL_ENCRYPTION_KEY: string; // base64-encoded 32 bytes for AES-GCM
  TURNSTILE_SECRET_KEY: string;
  // Legacy Firebase project id — retained during the Clerk migration so
  // existing code that still references it doesn't crash. Not used by
  // the auth middleware after Phase 3.
  FIREBASE_PROJECT_ID: string;
  // Clerk frontend API URL, e.g. `https://ethical-dingo-48.clerk.accounts.dev`
  // for development instances or `https://clerk.ptowl.com` for production.
  // Used by the Worker to verify Clerk session JWTs against the
  // matching JWKS endpoint.
  CLERK_FRONTEND_API_URL: string;

  // Environment variables
  ENVIRONMENT: string;
  // Primary frontend origin. Used for CSRF + CORS allow-list as the
  // canonical URL in single-domain deployments.
  FRONTEND_URL: string;
  // Optional comma-separated list of additional accepted origins.
  // Used to mirror the same Worker behind multiple branded domains
  // when we own them (e.g. a future ptowl.app or staging.ptowl.com).
  // Each entry is an absolute origin like https://example.com.
  // Validated against the request's Origin header at runtime.
  // Leave unset to use FRONTEND_URL alone.
  FRONTEND_URLS?: string;
}
