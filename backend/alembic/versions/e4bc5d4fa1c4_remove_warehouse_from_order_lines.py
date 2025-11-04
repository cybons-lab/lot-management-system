"""remove warehouse columns from order_lines

Revision ID: e4bc5d4fa1c4
Revises: d89f17c6d6a1
Create Date: 2025-11-03 00:40:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "e4bc5d4fa1c4"
down_revision = "d89f17c6d6a1"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("order_lines")}
    with op.batch_alter_table("order_lines") as batch_op:
        if "warehouse" in columns:
            batch_op.drop_column("warehouse")
        if "warehouse_id" in columns:
            batch_op.drop_column("warehouse_id")


def downgrade():
    pass
