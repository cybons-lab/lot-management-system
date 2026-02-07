import os
import subprocess
import time
import sys
from pathlib import Path

def run_command(command, cwd=None, env=None):
    """Run a shell command and return its output."""
    print(f"Executing: {command}")
    try:
        result = subprocess.run(
            command,
            shell=True,
            check=True,
            cwd=cwd,
            env={**os.environ, **(env or {})}
        )
        return result
    except subprocess.CalledProcessError as e:
        print(f"Error executing command: {e}")
        sys.exit(1)

def main():
    project_root = Path(__file__).parent.parent
    backend_dir = project_root / "backend"

    print("🔧 Setting up PostgreSQL test database...")

    # 1. Recreate test database to ensure cleanliness
    print("🧹 Recreating test database...")
    run_command("docker compose --profile test exec -T db-test psql -U testuser -d postgres -c \"DROP DATABASE IF EXISTS lot_management_test WITH (FORCE);\"", cwd=project_root)
    run_command("docker compose --profile test exec -T db-test psql -U testuser -d postgres -c \"CREATE DATABASE lot_management_test;\"", cwd=project_root)

    # 2. Wait for database to be ready (usually fast after recreation)
    print("⏳ Verifying database readiness...")
    # Health check loop
    max_retries = 30
    retry_interval = 2
    for i in range(max_retries):
        try:
            subprocess.run(
                "docker compose exec -T db-test pg_isready -U testuser -d lot_management_test",
                shell=True,
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                cwd=project_root
            )
            print("✅ Database is ready!")
            break
        except subprocess.CalledProcessError:
            if i < max_retries - 1:
                time.sleep(retry_interval)
            else:
                print("❌ Database failed to become ready in time.")
                sys.exit(1)

    # 3. Run migrations
    print("🔄 Setting up schema on test database...")
    
    # Path to baseline SQL
    baseline_sql = project_root / "backend" / "alembic" / "baseline_2026_02_06.sql"
    
    if baseline_sql.exists():
        print(f"📄 Importing baseline SQL: {baseline_sql.name}")
        # Use psql for fast import
        if sys.platform == "win32":
            # Windows: Need to handle redirection carefully or use cat equivalent
            run_command(f"docker compose --profile test exec -T db-test psql -U testuser -d lot_management_test < {baseline_sql}", cwd=project_root)
        else:
            run_command(f"cat {baseline_sql} | docker compose --profile test exec -T db-test psql -U testuser -d lot_management_test", cwd=project_root)
        
        print("Ticket: Stamping baseline and merge head...")
        run_command("uv run alembic stamp 57a61e701331", cwd=backend_dir)

        print("🛠️ Applying test-specific schema adjustments...")
        # 1. lot_receipts.consumed_quantity DEFAULT 0
        # 2. lot_receipts.supplier_item_id DROP NOT NULL
        # 3. order_lines.delivery_place_id DROP NOT NULL
        # 4. order_lines.supplier_item_id DROP NOT NULL
        adjustments = [
            "ALTER TABLE lot_receipts ALTER COLUMN consumed_quantity SET DEFAULT 0;",
            "ALTER TABLE lot_receipts ALTER COLUMN supplier_item_id DROP NOT NULL;",
            "ALTER TABLE order_lines ALTER COLUMN delivery_place_id DROP NOT NULL;",
            "ALTER TABLE order_lines ALTER COLUMN supplier_item_id DROP NOT NULL;",
            # Add missing index for FEFO (defined in model but missing in migrations)
            "CREATE INDEX IF NOT EXISTS idx_lot_receipts_fefo_allocation ON lot_receipts (supplier_item_id, warehouse_id, expiry_date, received_date, id) WHERE status = 'active' AND inspection_status IN ('not_required', 'passed');"
        ]
        for sql in adjustments:
            run_command(f"docker compose exec -T db-test psql -U testuser -d lot_management_test -c \"{sql}\"", cwd=project_root)
    else:
        print("⚠️ Baseline SQL not found, running full migrations...")

    print("🆙 Upgrading to latest migration head...")
    run_command("uv run alembic upgrade head", cwd=backend_dir)

    print("\n✅ Test database setup complete!")
    print("\n📝 You can now run tests with:")
    print("   cd backend")
    print("   export TEST_DATABASE_URL='postgresql://testuser:testpass@localhost:5433/lot_management_test'")
    print("   pytest tests/api/test_orders.py -v\n")

if __name__ == "__main__":
    main()
