#!/bin/bash
set -e

echo "========================================="
echo "InventoryEver - Database Migration"
echo "========================================="
echo ""
echo "This script assumes you have the Supabase CLI installed."
echo "If not: npm install -g supabase"
echo ""
echo "Applying migrations..."

# Check for supabase project link
if [ ! -f ".supabase/config.toml" ]; then
  echo "NOTE: Run 'supabase link --project-ref YOUR_PROJECT_ID' first."
  echo "Then re-run this script."
  exit 1
fi

supabase db push

echo ""
echo "✅ Migrations applied!"
echo ""
echo "OR: If not using Supabase CLI, run these files manually"
echo "in Supabase SQL Editor:"
echo "  1. database/migrations/001_initial_schema.sql"
echo "  2. database/migrations/002_rls_policies.sql"
echo "  3. database/migrations/003_storage_and_realtime.sql"
