#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter @workspace/db run push-force

# Apply allergen_items migration if the table doesn't exist yet
psql "$DATABASE_URL" -f lib/db/migrations/0002_allergen_items.sql 2>/dev/null || true

# Seed allergen items from Excel if table is empty
COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM allergen_items;" 2>/dev/null | tr -d ' \n' || echo "0")
if [ "$COUNT" = "0" ]; then
  pnpm --filter @workspace/scripts run seed-allergens
fi
