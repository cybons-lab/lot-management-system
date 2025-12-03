#!/bin/bash
# Test database setup script
# Run this from the project root directory

set -e

echo "🔧 Setting up PostgreSQL test database..."

# 1. Start test database container
echo "📦 Starting test database container..."
docker compose -f docker-compose.test.yml up -d

# 2. Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Check if database is ready
docker compose -f docker-compose.test.yml exec -T test-db pg_isready -U testuser -d lot_management_test

# 3. Run migrations
echo "🔄 Running Alembic migrations on test database..."
cd backend
export DATABASE_URL="postgresql://testuser:testpass@localhost:5433/lot_management_test"
source .venv/bin/activate
alembic upgrade head

echo "✅ Test database setup complete!"
echo ""
echo "📝 You can now run tests with:"
echo "   cd backend"
echo "   source .venv/bin/activate"
echo "   export TEST_DATABASE_URL='postgresql://testuser:testpass@localhost:5433/lot_management_test'"
echo "   pytest tests/api/test_orders.py -v"
echo ""
echo "🛑 To stop test database:"
echo "   docker compose -f docker-compose.test.yml down"
