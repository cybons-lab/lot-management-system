"""データベース接続設定 / SQLAlchemyセッション管理.

【設計意図】データベースセッション管理の設計判断:

1. autocommit=False, autoflush=False の理由（L21）
   autocommit=False:
   - 理由: トランザクション境界を明示的に制御
   - デフォルト動作: db.commit() を呼ぶまでDBに反映されない
   - メリット: サービス層で複数操作をまとめてcommit → 整合性保証
   例: 受注作成 + 明細作成 + 在庫引当 → 一括commit

   autoflush=False:
   - 理由: SQLAlchemy が自動的に flush() するタイミングを制御
   - デフォルト動作: query実行前に自動flush → 予期しないSQL発行
   - メリット: flush() のタイミングを明示的に制御 → パフォーマンス向上
   トレードオフ: flush() 忘れると、IDが取得できない（order.id等）

2. get_db() ジェネレータパターン（L24-30）
   理由: FastAPI の Depends() で使用するジェネレータ
   動作:
   - try: リクエスト開始時に db セッション作成
   - yield: ルート関数にセッションを注入
   - finally: リクエスト終了時に db.close() 実行
   メリット:
   - リソースリークを防ぐ（必ず close() される）
   - 例外が発生してもセッションがクローズされる

3. echo=True in development（L16-18）
   理由: 開発時にSQL文をログ出力
   用途:
   - N+1問題の検出（大量のSELECT文が発行されていないか）
   - クエリパフォーマンスの確認
   - デバッグ時のSQL確認
   本番環境: echo=False → ログが肥大化しない

4. truncate_all_tables() の設計（L62-98）
   RESTART IDENTITY:
   - 理由: シーケンス（id等の自動採番）をリセット
   - 動作: id=1 から再開
   - 用途: テストデータ投入時、常に同じIDから始まる

   CASCADE:
   - 理由: 外部キー制約を無視してTRUNCATE
   - 動作: 参照元テーブルも一緒にTRUNCATEされる
   - 例: orders を TRUNCATE すると order_lines も削除

   alembic_version を除外:
   - 理由: マイグレーション履歴を保持
   - 動作: Alembic が「どのマイグレーションまで適用済みか」を記録
   - メリット: データ削除後も、スキーマバージョンが保たれる

5. drop_db() と truncate_all_tables() の使い分け（L101-122）
   drop_db():
   - 用途: スキーマ定義も含めて完全リセット
   - 動作: テーブル構造自体を削除
   - リスク: Alembicマイグレーションを再実行する必要あり

   truncate_all_tables():
   - 用途: データのみリセット（推奨）
   - 動作: テーブル構造は保持
   - メリット: マイグレーション不要、高速
"""

import logging
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from .config import settings


logger = logging.getLogger(__name__)

# --- Engine ---------------------------------------------------------------
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,  # ログ出力は logging.py で制御（sqlalchemy.engine を使用）
    pool_pre_ping=True,  # 接続切れ検知・自動再接続
    pool_recycle=3600,  # 1時間毎に接続をリサイクル
)

# --- Session --------------------------------------------------------------
# 【設計】autocommit=False, autoflush=False でトランザクション境界を明示的に制御
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


def truncate_all_tables(db: Session | None = None) -> None:
    """全テーブルのデータを削除（開発/検証用途）.

    - テーブル構造は保持
    - alembic_versionは除外してマイグレーション履歴を保持
    - TRUNCATE ... RESTART IDENTITY CASCADEで外部キー制約を無視.
    """
    if settings.ENVIRONMENT == "production":
        raise ValueError("本番環境ではデータの削除はできません")

    # PostgreSQL: 全テーブルをTRUNCATE
    logger.info("🗑️ Truncating all tables in schema 'public'...")

    def _truncate(conn):
        # 開発/テスト環境でのデッドロック防止: ロックタイムアウトを設定
        conn.execute(text("SET LOCAL lock_timeout = '30s'"))

        # reset-database 同士の競合を避けるため、アドバイザリロックで直列化
        lock_key = "reset_database_truncate"
        conn.execute(text("SELECT pg_advisory_lock(hashtext(:key))"), {"key": lock_key})
        try:
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
            # まとめて1つのクエリで実行して高速化とロック最小化
            tables_str = ", ".join([f'"{t}"' for t in tables])
            conn.execute(text(f"TRUNCATE TABLE {tables_str} RESTART IDENTITY CASCADE"))
            logger.info(f"✅ {len(tables)} テーブルのデータを削除しました")
        finally:
            conn.execute(text("SELECT pg_advisory_unlock(hashtext(:key))"), {"key": lock_key})

    if db:
        _truncate(db)
        db.flush()  # 反映を確実にする
    else:
        with engine.begin() as conn:
            _truncate(conn)

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
