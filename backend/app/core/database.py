"""
データベース接続設定
SQLAlchemyセッション管理
"""

import logging
import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app.models import Base
from app.models.base_model import Base, set_sqlite_pragma

from .config import settings

logger = logging.getLogger(__name__)

# エンジンの作成
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    echo=settings.ENVIRONMENT == "development",  # 開発環境ではSQLログを出力
)
if engine.dialect.name == "sqlite":
    event.listen(engine, "connect", set_sqlite_pragma)

# セッションファクトリの作成
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """データベースセッションの依存性注入用関数"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """データベースの初期化（全テーブル作成）"""
    import app.models  # noqa

    # Base.metadata.create_all(bind=engine)
    logger.info("ℹ️ Skipped create_all; schema is managed by Alembic.")


def drop_db() -> None:
    """データベースの削除（開発環境のみ）"""
    if settings.ENVIRONMENT != "production":
        engine.dispose()
        logger.info("ℹ️ DBエンジンを破棄しました (接続プールをクローズ)")

        if "sqlite" in settings.DATABASE_URL:
            try:
                db_path_str = settings.DATABASE_URL.split(":///")[1]
                db_path = Path(db_path_str)

                if db_path.exists():
                    os.remove(db_path)
                    logger.info(f"🗑️ SQLite データベースファイル ({db_path}) を物理削除しました")
                else:
                    logger.info(
                        f"ℹ️ SQLite データベースファイル ({db_path}) は見つかりませんでした (削除スキップ)"
                    )
            except Exception as e:
                logger.warning(f"⚠️ SQLiteファイルの削除に失敗しました: {e}")
        else:
            Base.metadata.drop_all(bind=engine)
            logger.info("🗑️ データベーステーブルを削除しました")
    else:
        raise ValueError("本番環境ではデータベースの削除はできません")
