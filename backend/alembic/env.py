# backend/alembic/env.py
from __future__ import annotations

# --- ▼▼▼ ここから追加 ▼▼▼ ---
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context


# 'backend' フォルダ (app/ と alembic/ がある場所) へのパスを追加
# これにより、'app' パッケージをインポートできる
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

# app/models/base_model.py から Base をインポート
# app/models/__init__.py が他の全モデルをインポートするため、
# 'Base.metadata' に全テーブル定義がアタッチされる
from app.models import Base


# --- ▲▲▲ ここまで追加 ▲▲▲ ---


# alembic.ini の設定を読み込みます
config = context.config

# ログ設定
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- ▼▼▼ ここを修正 ▼▼▼ ---
# autogenerate(自動検出)のために、Base.metadata を設定します
target_metadata = Base.metadata
# --- ▲▲▲ 修正完了 ▲▲▲ ---


def run_migrations_offline() -> None:
    """Offline mode (for generating SQL scripts)"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Online mode (to apply changes to the DB)"""

    # ✅ 環境変数からDATABASE_URLを取得
    import os

    database_url = os.environ.get("DATABASE_URL")

    if database_url:
        # 環境変数が設定されている場合はそれを使用
        from sqlalchemy import create_engine

        connectable = create_engine(
            database_url,
            poolclass=pool.NullPool,
            future=True,
        )
    else:
        # 環境変数がない場合は alembic.ini から読み込む
        connectable = engine_from_config(
            config.get_section(config.config_ini_section),
            prefix="sqlalchemy.",
            poolclass=pool.NullPool,
            future=True,
        )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=True,
        )
        with context.begin_transaction():
            context.run_migrations()


# 実行
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
