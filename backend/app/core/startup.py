import logging

from alembic.config import Config
from alembic.runtime import migration
from sqlalchemy.orm import Session

from alembic import script
from app.application.services.admin.data_integrity_service import DataIntegrityService
from app.application.services.notification_service import NotificationService
from app.core.database import SessionLocal, engine
from app.infrastructure.persistence.models.auth_models import Role, UserRole
from app.infrastructure.persistence.models.notification_model import Notification
from app.presentation.schemas.notification_schema import NotificationCreate


logger = logging.getLogger(__name__)


def notify_admins(
    db: Session, title: str, message: str, link: str | None = None, type: str = "warning"
) -> None:
    """管理者に通知を送信するヘルパー."""
    try:
        # 冪等性: 同タイトルの未読通知があればスキップ
        existing = (
            db.query(Notification)
            .filter(Notification.title == title, Notification.is_read.is_(False))
            .first()
        )
        if existing:
            logger.info(f"ℹ️ 既に未読の通知が存在するためスキップ: {title}")
            return

        # 全 admin ユーザーに通知
        admin_role = db.query(Role).filter(Role.role_code == "admin").first()
        if not admin_role:
            return

        admin_ids = [
            ur.user_id for ur in db.query(UserRole).filter(UserRole.role_id == admin_role.id).all()
        ]

        notif_service = NotificationService(db)
        for uid in admin_ids:
            notif_service.create_notification(
                NotificationCreate(
                    user_id=uid,
                    title=title,
                    message=message,
                    type=type,
                    link=link,
                    display_strategy="persistent",
                )
            )
        logger.info(f"📨 {len(admin_ids)}名の管理者に通知を送信: {title}")
    except Exception as e:
        logger.error(f"❌ 通知送信失敗: {e}")


def check_alembic_revision_on_startup() -> None:
    """起動時にAlembicリビジョンをチェックする."""
    try:
        # 1. DBリビジョンの取得
        with engine.connect() as conn:
            context = migration.MigrationContext.configure(conn)
            current_rev = context.get_current_revision()

        if not current_rev:
            # 初期状態等はスキップ（必要に応じて通知）
            return

        # 2. コード上のHEADリビジョン取得
        try:
            alembic_cfg = Config("alembic.ini")
            if not alembic_cfg.get_main_option("script_location"):
                alembic_cfg.set_main_option("script_location", "alembic")
            script_directory = script.ScriptDirectory.from_config(alembic_cfg)
            head_rev = script_directory.get_current_head()
        except Exception as e:
            logger.warning(f"⚠️ Alembic設定の読み込みに失敗しました: {e}")
            return

        # 3. 整合性チェック
        # DBのリビジョンが履歴ツリーに含まれているか確認
        found_in_history = False
        try:
            for rev in script_directory.walk_revisions("head"):
                if rev.revision == current_rev:
                    found_in_history = True
                    break
        except Exception:
            # 履歴辿りに失敗した場合も不整合扱い
            pass

        if not found_in_history:
            title = "⚠️ DBリビジョン不整合 (Unknown Revision)"
            message = (
                f"現在のDBリビジョン '{current_rev}' がコード履歴に見つかりません。\n"
                f"ベースラインが変更された可能性があります。\n"
                f"解決策: `uv run alembic stamp head` を実行してください。"
            )
            logger.error(message)

            # 通知
            db = SessionLocal()
            try:
                notify_admins(db, title, message, link="/admin/system-settings", type="error")
            finally:
                db.close()

        elif current_rev != head_rev:
            logger.info(f"ℹ️ DBリビジョン待機中 (DB: {current_rev} -> HEAD: {head_rev})")

    except Exception as e:
        logger.error(f"❌ Alembicチェック失敗: {e}")


def check_data_integrity_on_startup() -> None:
    """起動時データ整合性チェック: 違反があれば管理者に通知する."""
    try:
        db = SessionLocal()
        try:
            service = DataIntegrityService(db)
            violations = service.scan_all()

            if not violations:
                logger.info("✅ データ整合性チェック: 違反なし")
                return

            total_rows = sum(v.violation_count for v in violations)
            tables = sorted({v.table_name for v in violations})
            logger.warning(
                "⚠️ データ整合性違反を検出",
                extra={
                    "violation_count": len(violations),
                    "affected_rows": total_rows,
                    "tables": tables,
                },
            )

            title = "データ整合性エラー検出"
            table_list = ", ".join(tables[:5])
            message = (
                f"{len(violations)}件のNOT NULL違反を検出 ({total_rows}行、テーブル: {table_list})"
            )

            notify_admins(db, title, message, link="/admin/data-maintenance", type="warning")

        finally:
            db.close()
    except Exception as e:
        logger.error(f"❌ データ整合性チェック失敗: {e}", exc_info=True)
