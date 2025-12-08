"""データベース接続設定 / SQLAlchemyセッション管理."""

import logging
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from .config import settings


logger = logging.getLogger(__name__)

# --- Engine ---------------------------------------------------------------
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.ENVIRONMENT == "development",  # 開発時はSQLログ
)

# --- Session --------------------------------------------------------------
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session]:
    """FastAPI 依存性注入用のDBセッション."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Schema lifecycle -----------------------------------------------------
def init_db() -> None:
    """Disable Alembic migrations at startup.

    現在は SQL / ダンプでスキーマを復元するため、ここでは何もしない。
    """
    import app.infrastructure.persistence.models  # noqa: F401

    logger.info("⏭️ init_db: skipping Alembic migrations (handled manually via SQL)")
    return


def _drop_dependent_views() -> None:
    """テーブル依存のVIEWを先にDROPする。 依存で落ちる代表VIEWをここへ列挙。存在しない場合はスキップ。."""
    dependent_views: list[str] = [
        # v2.2: lot_current_stock ビューは廃止（lots テーブルに統合済み）
        # 追加のVIEWがあればここに追記
        # "lot_daily_stock",
    ]

    with engine.begin() as conn:
        for view_name in dependent_views:
            try:
                conn.execute(text(f"DROP VIEW IF EXISTS {view_name} CASCADE"))
                logger.info(f"🗑️ Dropped view: {view_name}")
            except Exception as e:
                logger.warning(f"⚠️ VIEW削除に失敗しました ({view_name}): {e}")


def truncate_all_tables() -> None:
    """全テーブルのデータを削除（開発/検証用途）.

    - テーブル構造は保持
    - alembic_versionは除外してマイグレーション履歴を保持
    - TRUNCATE ... RESTART IDENTITY CASCADEで外部キー制約を無視.
    """
    if settings.ENVIRONMENT == "production":
        raise ValueError("本番環境ではデータの削除はできません")

    # PostgreSQL: 全テーブルをTRUNCATE
    logger.info("🗑️ Truncating all tables in schema 'public'...")
    with engine.begin() as conn:
        # public配下の全テーブル名を取得（alembic_versionを除く）
        result = conn.execute(
            text("""
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename != 'alembic_version'
            ORDER BY tablename
        """)
        )
        tables = [row[0] for row in result]

        if not tables:
            logger.info("ℹ️ Truncate対象のテーブルがありません")
            return

        # TRUNCATE実行（RESTART IDENTITYでシーケンスもリセット、CASCADEで外部キー制約を無視）
        for table in tables:
            conn.execute(text(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE'))
            logger.debug(f"  - Truncated: {table}")

        logger.info(f"✅ {len(tables)} テーブルのデータを削除しました")

    logger.info("ℹ️ alembic_versionは保持されました（マイグレーション履歴を維持）")


def drop_db() -> None:
    """データベースの削除（開発/検証用途） スキーマ public を CASCADE で落として再作成.

    ⚠️ 推奨: データのみをリセットする場合は truncate_all_tables() を使用してください
    """
    if settings.ENVIRONMENT == "production":
        raise ValueError("本番環境ではデータベースの削除はできません")

    # PostgreSQL: スキーマごと初期化
    logger.info("🗑️ Dropping and recreating schema 'public'...")
    with engine.begin() as conn:
        # 必要なら別スキーマ名に変更（通常は public）
        schema = "public"
        conn.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE;'))
        conn.execute(text(f'CREATE SCHEMA "{schema}";'))
        # 検索パスを戻す（任意）
        conn.execute(text(f'SET search_path TO "{schema}";'))
        logger.info(f"✅ Schema '{schema}' has been recreated")

    # 接続プールを破棄
    engine.dispose()
    logger.info("ℹ️ DBエンジンを破棄しました (接続プールをクローズ)")
