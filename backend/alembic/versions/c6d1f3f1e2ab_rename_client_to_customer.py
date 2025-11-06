"""rename client columns to customer in forecasts

Revision ID: c6d1f3f1e2ab
Revises: b4dd2e0b31c8
Create Date: 2025-11-03 01:20:00
"""

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "c6d1f3f1e2ab"
down_revision = "b4dd2e0b31c8"
branch_labels = None
depends_on = None


def _table_exists(inspector, name: str) -> bool:
    return name in inspector.get_table_names()


# 先頭付近のimport群はそのまま。以下のヘルパーを追記
def _drop_index_if_exists(index_name: str, table_name: str):
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "postgresql":
        # PostgreSQLはIF EXISTSが使える
        op.execute(sa.text(f'DROP INDEX IF EXISTS "{index_name}"'))
    else:
        # SQLite 等：テーブルのインデックス一覧を見て存在する時だけDROP
        inspector = sa.inspect(bind)
        idx_names = [ix["name"] for ix in inspector.get_indexes(table_name)]
        if index_name in idx_names:
            op.drop_index(index_name, table_name=table_name)


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    table_name = "forecast" if _table_exists(inspector, "forecast") else "forecasts"
    if table_name == "forecast":
        op.rename_table("forecast", "forecasts")

    inspector = sa.inspect(bind)
    columns = {col["name"] for col in inspector.get_columns("forecasts")}
    with op.batch_alter_table("forecasts") as batch_op:
        if "client_id" in columns:
            batch_op.alter_column("client_id", new_column_name="customer_id")
        if "client_code" in columns:
            batch_op.alter_column("client_code", new_column_name="customer_code")

    # ここを置き換え（try/except削除）
    _drop_index_if_exists("idx_client_product", "forecasts")

    # 新インデックス作成
    op.create_index("idx_customer_product", "forecasts", ["customer_id", "product_id"])


def downgrade():
    # 念のためIF EXISTSで冪等化
    _drop_index_if_exists("idx_customer_product", "forecasts")

    inspector = sa.inspect(op.get_bind())
    columns = {col["name"] for col in inspector.get_columns("forecasts")}
    with op.batch_alter_table("forecasts") as batch_op:
        if "customer_id" in columns:
            batch_op.alter_column("customer_id", new_column_name="client_id")
        if "customer_code" in columns:
            batch_op.alter_column("customer_code", new_column_name="client_code")

    # 旧インデックスも存在時のみ復活
    # （ダウン時に失敗しないよう冪等化）
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            sa.text(
                'CREATE INDEX IF NOT EXISTS "idx_client_product" ON forecasts (client_id, product_id)'
            )
        )
    else:
        inspector = sa.inspect(bind)
        idx_names = [ix["name"] for ix in inspector.get_indexes("forecasts")]
        if "idx_client_product" not in idx_names:
            op.create_index("idx_client_product", "forecasts", ["client_id", "product_id"])

    op.rename_table("forecasts", "forecast")
