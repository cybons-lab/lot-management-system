"""allow_multiple_primary_per_supplier

Revision ID: c80c28cd0a5a
Revises: 73e14976215a
Create Date: 2026-01-31 19:25:41.093999

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "c80c28cd0a5a"
down_revision = "73e14976215a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """1仕入先につき複数の担当者を許可するため、unique indexを削除"""
    # unique index を削除
    op.drop_index("uq_user_supplier_primary_per_supplier", table_name="user_supplier_assignments")


def downgrade() -> None:
    """ロールバック用: indexを再作成"""
    # unique index を再作成
    # NOTE: downgrade前に手動でis_primary=trueが1仕入先1人になるようにデータを調整する必要あり
    op.create_index(
        "uq_user_supplier_primary_per_supplier",
        "user_supplier_assignments",
        ["supplier_id"],
        unique=True,
        postgresql_where=sa.text("is_primary = true"),
    )
