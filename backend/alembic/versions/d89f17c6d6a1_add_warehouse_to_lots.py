"""add warehouse_id and lot_unit to lots

Revision ID: d89f17c6d6a1
Revises: b7a02f6db5a0
Create Date: 2025-11-03 00:30:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "d89f17c6d6a1"
down_revision = "b7a02f6db5a0"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = {col["name"] for col in inspector.get_columns("lots")}

    if "warehouse_id" not in columns:
        op.add_column("lots", sa.Column("warehouse_id", sa.Text(), nullable=True))
    if "lot_unit" not in columns:
        op.add_column("lots", sa.Column("lot_unit", sa.String(length=10), nullable=True))

    connection.execute(
        sa.text("UPDATE lots SET warehouse_id = warehouse_code WHERE warehouse_code IS NOT NULL")
    )

    default_wh = connection.execute(
        sa.text("SELECT warehouse_code FROM warehouses ORDER BY warehouse_code LIMIT 1")
    ).scalar()

    if default_wh is None:
        connection.execute(
            sa.text(
                """
                INSERT INTO warehouses (warehouse_code, warehouse_name, created_by)
                VALUES ('WH-DEFAULT', 'デフォルト倉庫', 'system')
                """
            )
        )
        default_wh = "WH-DEFAULT"

    connection.execute(
        sa.text("UPDATE lots SET warehouse_id = :code WHERE warehouse_id IS NULL"),
        {"code": default_wh},
    )

    with op.batch_alter_table("lots") as batch_op:
        batch_op.alter_column("warehouse_id", nullable=False)
        existing_fks = {fk.get("name") for fk in inspector.get_foreign_keys("lots")}
        if "fk_lots_warehouse" not in existing_fks:
            batch_op.create_foreign_key(
                "fk_lots_warehouse",
                "warehouses",
                ["warehouse_id"],
                ["warehouse_code"],
            )


def downgrade():
    op.drop_constraint("fk_lots_warehouse", "lots", type_="foreignkey")
    op.drop_column("lots", "lot_unit")
    op.drop_column("lots", "warehouse_id")
