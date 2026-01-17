#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🔍 Starting Migration Safety Check..."

# Check if docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}Error: Docker is not running${NC}"
  exit 1
fi

# Start Test DB
echo "🚀 Starting Test DB..."
docker compose --profile test up -d db-postgres-test

# Wait for DB
echo "⏳ Waiting for Test DB to be ready..."
# Use a loop to check connection (simple sleep for now or pg_isready if available, or just tight loop with python)
sleep 5 # Simple wait, better to use health check but keeping it simple as per project norms

# Define Test DB URL (matches TEST_DB_USAGE.md)
TEST_DATABASE_URL="postgresql+psycopg2://testuser:testpass@localhost:5433/lot_management_test"

# Run Migrations
echo "🔄 Running Alembic Upgrade Head..."
cd backend
if TEST_DATABASE_URL="$TEST_DATABASE_URL" uv run alembic upgrade head; then
    echo -e "${GREEN}✅ Migration Successful!${NC}"
else
    echo -e "${RED}❌ Migration Failed!${NC}"
    exit 1
fi

# Optional: Downgrade Check? (Maybe too aggressive for every check, can stay with upgrade for now)
# echo "🔄 Verifying Downgrade..."
# TEST_DATABASE_URL="$TEST_DATABASE_URL" uv run alembic downgrade -1
# TEST_DATABASE_URL="$TEST_DATABASE_URL" uv run alembic upgrade head

echo "🎉 Migration Safety Integrity Check Passed!"
