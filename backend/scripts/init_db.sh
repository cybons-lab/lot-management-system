#!/bin/bash
# =============================================================
# Database Initialization Script for New Environments
# =============================================================
# Usage:
#   docker compose exec backend bash /app/scripts/init_db.sh
#
# This script:
#   1. Applies the baseline schema (tables only)
#   2. Creates all views from create_views.sql
#   3. Stamps alembic_version to current head
#
# WARNING: Only run on EMPTY databases!
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
BASELINES_DIR="$BACKEND_DIR/alembic/baselines"
VIEWS_DIR="$BACKEND_DIR/sql/views"

echo "=== Database Initialization Script ==="

# Check if database already has tables
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
TABLE_COUNT=$(echo "$TABLE_COUNT" | tr -d ' ')

if [ "$TABLE_COUNT" -gt "1" ]; then
    echo "ERROR: Database already has $TABLE_COUNT tables."
    echo "This script is only for NEW, empty databases."
    echo "For existing databases, use: alembic upgrade head"
    exit 1
fi

echo "Step 1: Applying baseline schema..."
psql "$DATABASE_URL" -f "$BASELINES_DIR/baseline_schema_20260119.sql"

echo "Step 2: Creating views..."
psql "$DATABASE_URL" -f "$VIEWS_DIR/create_views.sql"

echo "Step 3: Stamping alembic version..."
cd "$BACKEND_DIR"
alembic stamp head

echo "=== Initialization complete! ==="
echo "Current alembic version:"
alembic current
