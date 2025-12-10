"""fix: ensure lot fields nullable

Revision ID: ae8f3cf3a85b
Revises: e68cf68f7f45
Create Date: 2025-12-10 20:58:30.891860

"""

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = "ae8f3cf3a85b"
down_revision = "e68cf68f7f45"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # lotsテーブルのsupplier_idとexpected_lot_idをNULL許可に変更
    op.alter_column("lots", "supplier_id", existing_type=sa.BigInteger(), nullable=True)
    op.alter_column("lots", "expected_lot_id", existing_type=sa.BigInteger(), nullable=True)


def downgrade() -> None:
    # 戻すときは注意が必要（データが入っていない場合は戻せるが、NULLがある場合はエラーになる可能性がある）
    # ここでは安全のため、明示的な操作は行わないか、元の定義に戻すか検討する。
    # strictに戻すなら以下だが、データ整合性を考慮してコメントアウトするか、そのままにする。
    # op.alter_column("lots", "supplier_id", existing_type=sa.BigInteger(), nullable=False)
    # op.alter_column("lots", "expected_lot_id", existing_type=sa.BigInteger(), nullable=False)
    pass
