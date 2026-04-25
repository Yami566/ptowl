export interface Env {
  // D1 Database binding
  DB: D1Database;

  // R2 binding for clinic logos (optional — falls back to base64-in-D1
  // if the bucket isn't configured yet). Bucket: ptowl-logos.
  LOGOS?: R2Bucket;

  // Secrets (set via `wrangler secret put`)
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  EMAIL_API_KEY: string;
  EMAIL_ENCRYPTION_KEY: string; // base64-encoded 32 bytes for AES-GCM
  TURNSTILE_SECRET_KEY: string;
  FIREBASE_PROJECT_ID: string;

  // Environment variables
  ENVIRONMENT: string;
  FRONTEND_URL: string;
}
