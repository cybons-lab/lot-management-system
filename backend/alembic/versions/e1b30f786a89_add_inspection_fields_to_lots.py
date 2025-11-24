"""add_inspection_fields_to_lots

Revision ID: e1b30f786a89
Revises: 659d4edb27f9
Create Date: 2025-11-24 12:59:32.000090

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e1b30f786a89'
down_revision = '659d4edb27f9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add inspection_status column with CHECK constraint
    op.execute("""
        ALTER TABLE lots 
        ADD COLUMN inspection_status VARCHAR(20) NOT NULL DEFAULT 'not_required'
    """)
    op.execute("""
        ALTER TABLE lots 
        ADD CONSTRAINT chk_lots_inspection_status 
        CHECK (inspection_status IN ('not_required', 'pending', 'passed', 'failed'))
    """)
    
    # Add inspection_date column (nullable)
    op.execute("""
        ALTER TABLE lots 
        ADD COLUMN inspection_date DATE NULL
    """)
    
    # Add inspection_cert_number column (nullable)
    op.execute("""
        ALTER TABLE lots 
        ADD COLUMN inspection_cert_number VARCHAR(100) NULL
    """)


def downgrade() -> None:
    # Remove inspection fields in reverse order
    op.execute("ALTER TABLE lots DROP COLUMN IF EXISTS inspection_cert_number")
    op.execute("ALTER TABLE lots DROP COLUMN IF EXISTS inspection_date")
    op.execute("ALTER TABLE lots DROP CONSTRAINT IF EXISTS chk_lots_inspection_status")
    op.execute("ALTER TABLE lots DROP COLUMN IF EXISTS inspection_status")
