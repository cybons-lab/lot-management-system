"""System Config Service.

システム設定値の取得・更新を行うサービス。
"""

from sqlalchemy.orm import Session

from app.infrastructure.persistence.models.system_config_model import SystemConfig


class SystemConfigService:
    """システム設定サービス."""

    def __init__(self, db: Session):
        """Initialize with database session."""
        self.db = db

    # Simple in-memory cache with TTL
    _cache: dict[str, tuple[str, float]] = {}
    _TTL_SECONDS = 5.0

    def get(self, key: str, default: str = "") -> str:
        """設定値を取得 (with TTL Cache).

        Args:
            key: 設定キー
            default: デフォルト値

        Returns:
            設定値、存在しない場合はデフォルト値
        """
        import time

        now = time.time()

        # Check cache
        if key in self._cache:
            val, timestamp = self._cache[key]
            if now - timestamp < self._TTL_SECONDS:
                return val

        # Fetch from DB
        config = self.db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
        val = default
        if config and config.config_value:
            val = config.config_value

        # Update cache
        self._cache[key] = (val, now)
        return val

    def set(self, key: str, value: str, description: str | None = None) -> SystemConfig:
        """設定値を保存（upsert）.

        Args:
            key: 設定キー
            value: 設定値
            description: 説明

        Returns:
            更新/作成されたSystemConfig
        """
        config = self.db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
        if config:
            config.config_value = value
            if description:
                config.description = description

            # Explicitly update updated_at if it exists on model (assuming it inherits from Base with timestamps)
            # Or if it's a server_default, we might need to touch it.
            # Checking model definition first is better, but safe to import datetime
            from datetime import UTC, datetime

            if hasattr(config, "updated_at"):
                config.updated_at = datetime.now(UTC)
        else:
            config = SystemConfig(
                config_key=key,
                config_value=value,
                description=description,
            )
            self.db.add(config)
        self.db.commit()
        self.db.refresh(config)

        # Invalidate cache
        if key in self._cache:
            del self._cache[key]

        return config

    def get_all(self, prefix: str | None = None) -> list[SystemConfig]:
        """全設定値を取得 (No Cache).

        Args:
            prefix: キーのプレフィックスでフィルタ（オプション）

        Returns:
            設定リスト
        """
        query = self.db.query(SystemConfig)
        if prefix:
            query = query.filter(SystemConfig.config_key.startswith(prefix))
        return query.order_by(SystemConfig.config_key).all()

    def get_bool(self, key: str, default: bool = False) -> bool:
        """真偽値として取得."""
        val = self.get(key, str(default).lower()).lower()
        return val in ("true", "1", "yes", "on", "t")

    def get_int(self, key: str, default: int = 0) -> int:
        """整数として取得."""
        try:
            return int(self.get(key, str(default)))
        except (ValueError, TypeError):
            return default


# 設定キー定数
class ConfigKeys:
    """システム設定キー定数."""

    CLOUD_FLOW_URL_MATERIAL_DELIVERY = "cloud_flow_url_material_delivery"
    CLOUD_FLOW_URL_PROGRESS_DOWNLOAD = "cloud_flow_url_progress_download"
    ENABLE_DB_BROWSER = "enable_db_browser"
    MAINTENANCE_MODE = "maintenance_mode"
    LOG_LEVEL = "log_level"
    PAGE_VISIBILITY = "page_visibility"
