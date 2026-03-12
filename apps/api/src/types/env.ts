export interface Env {
  // D1 Database binding
  DB: D1Database;

  // Secrets (set via `wrangler secret put`)
  JWT_SECRET: string;
  ADMIN_EMAIL: string;
  EMAIL_API_KEY: string;
  TURNSTILE_SECRET_KEY: string;
  FIREBASE_PROJECT_ID: string;

  // Environment variables
  ENVIRONMENT: string;
  FRONTEND_URL: string;
}
