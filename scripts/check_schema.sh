#!/bin/bash
# Schema consistency check script

echo "================================================================================"
echo "Schema Consistency Check"
echo "================================================================================"

# 1. Alembic check
echo ""
echo "📋 Alembic Check (モデル定義 vs DB実態)"
echo "--------------------------------------------------------------------------------"
cd backend
alembic check
echo ""

# 2. Get DB schema dump
echo "📊 Database Schema Dump"
echo "--------------------------------------------------------------------------------"
pg_dump -h localhost -U postgres -d lot_management_system \
  --schema-only --no-owner --no-privileges \
  -t 'public.*' \
  -f schema_dump.sql 2>/dev/null || echo "⚠️  pg_dump not available or DB not accessible"

if [ -f schema_dump.sql ]; then
  echo "✅ Schema dumped to backend/schema_dump.sql"
  echo ""
  echo "📊 Tables in DB:"
  grep "CREATE TABLE" schema_dump.sql | sed 's/CREATE TABLE /  - /' | sed 's/ (//'
  echo ""
  echo "📊 Views in DB:"
  grep "CREATE VIEW" schema_dump.sql | sed 's/CREATE VIEW /  - /' | sed 's/ AS//'
fi

echo ""
echo "================================================================================"
echo "✅ Check complete!"
echo "================================================================================"
