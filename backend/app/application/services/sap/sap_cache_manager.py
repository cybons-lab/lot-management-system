"""SAPキャッシュの有効期限管理."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.logging import get_logger
from app.infrastructure.persistence.models.sap_models import SapMaterialCache


logger = get_logger(__name__)


class SapCacheManager:
    """SAPキャッシュの有効期限管理."""

    CACHE_TTL_HOURS = 24  # キャッシュ有効期限（時間）

    def __init__(self, db: Session):
        """
        初期化.

        Args:
            db: データベースセッション

        """
        self.db = db

    def is_cache_stale(self, kunnr: str, connection_id: int | None = None) -> bool:
        """
        キャッシュが古いかどうか判定.

        Args:
            kunnr: 得意先コード
            connection_id: SAP接続ID（Noneの場合はデフォルト接続）

        Returns:
            True: キャッシュが古い（24時間以上経過 or 存在しない）
            False: キャッシュが新鮮（24時間以内）

        """
        # 最新のfetched_atを取得
        stmt = select(func.max(SapMaterialCache.fetched_at)).where(SapMaterialCache.kunnr == kunnr)
        if connection_id:
            stmt = stmt.where(SapMaterialCache.connection_id == connection_id)

        latest_fetched_at = self.db.execute(stmt).scalar()

        # キャッシュが存在しない場合は古いとみなす
        if not latest_fetched_at:
            logger.info(
                "SAP cache not found (considered stale)",
                extra={"kunnr": kunnr, "connection_id": connection_id},
            )
            return True

        # 24時間以上経過していれば古い
        now = datetime.now(UTC)
        # latest_fetched_atがnaiveの場合、UTCとして扱う
        if latest_fetched_at.tzinfo is None:
            latest_fetched_at = latest_fetched_at.replace(tzinfo=UTC)

        age = now - latest_fetched_at
        is_stale = age > timedelta(hours=self.CACHE_TTL_HOURS)

        logger.info(
            "SAP cache staleness check",
            extra={
                "kunnr": kunnr,
                "connection_id": connection_id,
                "latest_fetched_at": latest_fetched_at.isoformat(),
                "age_hours": age.total_seconds() / 3600,
                "is_stale": is_stale,
            },
        )

        return is_stale
