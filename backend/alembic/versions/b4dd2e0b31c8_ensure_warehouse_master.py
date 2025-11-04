"""ensure warehouse master exists

Revision ID: b4dd2e0b31c8
Revises: a13c02758a9d
Create Date: 2025-11-03 01:10:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "b4dd2e0b31c8"
down_revision = "a13c02758a9d"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    count = connection.execute(sa.text("SELECT COUNT(*) FROM warehouses")).scalar()
    if not count:
        connection.execute(
            sa.text(
                """
                INSERT INTO warehouses (warehouse_code, warehouse_name, created_by)
                VALUES ('WH-A', '本社倉庫', 'system')
                """
            )
        )


def downgrade():
    pass
