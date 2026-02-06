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
# alembic/ ディレクトリも追加（sql_utils インポート用）
sys.path.append(os.path.dirname(__file__))

# app/models/base_model.py から Base をインポート
# app/models/__init__.py が他の全モデルをインポートするため、
# 'Base.metadata' に全テーブル定義がアタッチされる
from sql_utils import split_sql_statements as _split_sql_statements

from app.core.config import settings
from app.infrastructure.persistence.models import Base


# --- ▲▲▲ ここまで追加 ▲▲▲ ---


def include_object(object, name, type_, reflected, compare_to):
    """
    Alembicのautogenerate対象を制御する関数.

    ビュー（is_view=Trueのテーブル）を除外します。
    """
    if type_ == "table" and hasattr(object, "info") and object.info.get("is_view"):
        return False
    return True


# alembic.ini の設定を読み込みます
config = context.config

config.set_main_option("sqlalchemy.url", str(settings.DATABASE_URL))
# ログ設定
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- ▼▼▼ ここを修正 ▼▼▼ ---
# autogenerate(自動検出)のために、Base.metadata を設定します
target_metadata = Base.metadata
# --- ▲▲▲ 修正完了 ▲▲▲ ---


def _recreate_views_after_migration(connection) -> None:
    """
    マイグレーション完了後にビューを自動再生成する.

    sql/views/create_views.sql を読み込んで実行します。
    ファイルが存在しない場合は何もしません（警告のみ）。
    """
    from pathlib import Path

    from sqlalchemy import text

    sql_dir = Path(__file__).parent.parent / "sql" / "views"
    create_views_sql = sql_dir / "create_views.sql"

    if not create_views_sql.exists():
        print(f"⚠️  Warning: {create_views_sql} not found. Skipping view recreation.")
        return

    print("🔄 Recreating database views...")

    try:
        sql_content = create_views_sql.read_text(encoding="utf-8")

        # 複数のSQL文を分割して実行
        for statement in _split_sql_statements(sql_content):
            if statement.strip():
                connection.execute(text(statement))

        connection.commit()
        print("✅ Database views recreated successfully")
    except Exception as e:
        print(f"⚠️  Failed to recreate views (non-fatal): {e}")
        # ビュー再作成失敗はマイグレーション自体を止めない


def run_migrations_offline() -> None:
    """Offline mode (for generating SQL scripts)"""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
        render_as_batch=True,
        include_object=include_object,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Online mode (to apply changes to the DB)"""

    # ✅ 環境変数からDATABASE_URLを取得
    section = config.get_section(config.config_ini_section)
    if section is None:
        section = {}
    from typing import Any, cast

    connectable = engine_from_config(
        cast(dict[str, Any], section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            render_as_batch=True,
            include_object=include_object,
        )
        with context.begin_transaction():
            context.run_migrations()

        # ✅ マイグレーション完了後にビューを自動再生成
        _recreate_views_after_migration(connection)


# 実行
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
