"""Apply allocation table migration for provisional allocation support.

This script applies the migration to add provisional allocation support:
- Add inbound_plan_line_id column
- Make lot_id nullable
- Add 'provisional' status
"""

import os
import sys

from sqlalchemy import create_engine, text

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings  # noqa: E402


def main():
    """Apply the allocation table migration."""
    engine = create_engine(str(settings.DATABASE_URL))

    with engine.connect() as conn:
        print("Applying allocation table migration...")

        # 1. Add inbound_plan_line_id column
        print("1. Adding inbound_plan_line_id column...")
        conn.execute(
            text("""
            ALTER TABLE allocations
            ADD COLUMN IF NOT EXISTS inbound_plan_line_id BIGINT
        """)
        )
        conn.commit()

        # 2. Add foreign key constraint
        print("2. Adding foreign key constraint...")
        conn.execute(
            text("""
            ALTER TABLE allocations
            DROP CONSTRAINT IF EXISTS fk_allocations_inbound_plan_line
        """)
        )
        conn.execute(
            text("""
            ALTER TABLE allocations
            ADD CONSTRAINT fk_allocations_inbound_plan_line
            FOREIGN KEY (inbound_plan_line_id)
            REFERENCES inbound_plan_lines(id)
            ON DELETE CASCADE
        """)
        )
        conn.commit()

        # 3. Make lot_id nullable
        print("3. Making lot_id nullable...")
        conn.execute(
            text("""
            ALTER TABLE allocations
            ALTER COLUMN lot_id DROP NOT NULL
        """)
        )
        conn.commit()

        # 4. Update status check constraint
        print("4. Updating status check constraint...")
        conn.execute(
            text("""
            ALTER TABLE allocations
            DROP CONSTRAINT IF EXISTS chk_allocations_status
        """)
        )
        conn.execute(
            text("""
            ALTER TABLE allocations
            ADD CONSTRAINT chk_allocations_status
            CHECK (status IN ('allocated', 'provisional', 'shipped', 'cancelled'))
        """)
        )
        conn.commit()

        # 5. Create index
        print("5. Creating index on inbound_plan_line_id...")
        conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS idx_allocations_inbound_plan_line
            ON allocations(inbound_plan_line_id)
        """)
        )
        conn.commit()

        print("✅ Allocation table migration completed successfully!")


if __name__ == "__main__":
    main()
