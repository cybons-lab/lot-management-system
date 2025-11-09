"""
データベース接続設定 / SQLAlchemyセッション管理
"""

import logging
import os
import subprocess
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import Session, sessionmaker

# モデル登録（init_db内でimportするが、型参照のためここにも置いて問題なし）
from app.models.base_model import Base, set_sqlite_pragma
from .config import settings

logger = logging.getLogger(__name__)

# --- Engine ---------------------------------------------------------------
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=settings.ENVIRONMENT == "development",  # 開発時はSQLログ
)
if engine.dialect.name == "sqlite":
    event.listen(engine, "connect", set_sqlite_pragma)

# --- Session --------------------------------------------------------------
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """FastAPI 依存性注入用のDBセッション"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Schema lifecycle -----------------------------------------------------
def init_db() -> None:
    """
    DB初期化（テーブル作成はAlembicに委譲）
    Alembicマイグレーションを実行してテーブルを作成します
    """
    import app.models  # noqa: F401  モデルのメタデータを読み込むための副作用import

    # Alembicマイグレーションを実行してテーブルを作成
    try:
        # プロジェクトルートディレクトリ（alembic.iniがある場所）
        backend_dir = Path(__file__).parent.parent.parent

        logger.info("🔄 Running Alembic migrations to create tables...")
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            check=True
        )
        logger.info("✅ Alembic migrations completed successfully")
        if result.stdout:
            logger.debug(f"Alembic output: {result.stdout}")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Alembic migration failed: {e}")
        logger.error(f"stdout: {e.stdout}")
        logger.error(f"stderr: {e.stderr}")
        raise RuntimeError(f"Failed to run Alembic migrations: {e.stderr}")
    except Exception as e:
        logger.error(f"❌ Unexpected error running Alembic: {e}")
        raise


def _drop_dependent_views() -> None:
    """
    テーブル依存のVIEWを先にDROPする。
    依存で落ちる代表VIEWをここへ列挙。存在しない場合はスキップ。
    """
    if "sqlite" in settings.DATABASE_URL:
        return

    dependent_views = [
        # 在庫集計ビュー（StockMovementに依存）
        "lot_current_stock",
        # 追加のVIEWがあればここに追記
        # "lot_daily_stock",
    ]

    with engine.begin() as conn:
        for view_name in dependent_views:
            try:
                conn.execute(text(f'DROP VIEW IF EXISTS {view_name} CASCADE'))
                logger.info(f"🗑️ Dropped view: {view_name}")
            except Exception as e:
                logger.warning(f"⚠️ VIEW削除に失敗しました ({view_name}): {e}")


def drop_db() -> None:
    """
    データベースの削除（開発/検証用途）
    - SQLite: 物理ファイル削除
    - PostgreSQL: スキーマ public を CASCADE で落として再作成
    """
    if settings.ENVIRONMENT == "production":
        raise ValueError("本番環境ではデータベースの削除はできません")

    # SQLite: 物理ファイル削除（従来どおり）
    if "sqlite" in settings.DATABASE_URL:
        engine.dispose()
        try:
            db_path_str = settings.DATABASE_URL.split(":///")[1]
        except IndexError:
            return
        db_path = Path(db_path_str)
        if db_path.exists():
            os.remove(db_path)
            logger.info("🗑️ Deleted SQLite database file")
        return

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
