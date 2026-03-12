#!/bin/bash
# PTOWL Deployment Script
# Run this after: npx wrangler login

set -e

echo "=== PTOWL Deployment ==="
echo ""

# Step 1: Check auth
echo "[1/7] Checking Wrangler authentication..."
npx wrangler whoami || { echo "ERROR: Not authenticated. Run 'npx wrangler login' first."; exit 1; }
echo ""

# Step 2: Create D1 database (if not exists)
echo "[2/7] Creating D1 database..."
DB_OUTPUT=$(npx wrangler d1 create ptowl-db 2>&1 || echo "already_exists")
if echo "$DB_OUTPUT" | grep -q "already_exists\|already exists"; then
  echo "Database already exists, skipping..."
else
  echo "$DB_OUTPUT"
  echo ""
  echo "IMPORTANT: Copy the database_id from above and update apps/api/wrangler.jsonc"
  echo "Then re-run this script."
  exit 0
fi
echo ""

# Step 3: Run migration
echo "[3/7] Running database migration..."
cd apps/api
npx wrangler d1 execute ptowl-db --remote --file=src/migrations/0001_initial.sql
cd ../..
echo ""

# Step 4: Build
echo "[4/7] Building project..."
pnpm run build
echo ""

# Step 5: Deploy Worker (API)
echo "[5/7] Deploying API Worker..."
cd apps/api
npx wrangler deploy
cd ../..
echo ""

# Step 6: Deploy Pages (Frontend)
echo "[6/7] Deploying Frontend to Pages..."
cd apps/web
npx wrangler pages deploy dist --project-name=ptowl
cd ../..
echo ""

# Step 7: Remind about secrets
echo "[7/7] Reminder: Set these secrets if not already done:"
echo "  npx wrangler secret put JWT_SECRET"
echo "  npx wrangler secret put ADMIN_EMAIL"
echo ""
echo "=== Deployment Complete ==="
echo "Frontend: https://ptowl.com"
echo "API: https://api.ptowl.com"
