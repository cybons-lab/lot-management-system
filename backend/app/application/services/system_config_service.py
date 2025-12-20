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

    def get(self, key: str, default: str = "") -> str:
        """設定値を取得.

        Args:
            key: 設定キー
            default: デフォルト値

        Returns:
            設定値、存在しない場合はデフォルト値
        """
        config = self.db.query(SystemConfig).filter(SystemConfig.config_key == key).first()
        if config and config.config_value:
            return config.config_value
        return default

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
        else:
            config = SystemConfig(
                config_key=key,
                config_value=value,
                description=description,
            )
            self.db.add(config)
        self.db.commit()
        self.db.refresh(config)
        return config

    def get_all(self, prefix: str | None = None) -> list[SystemConfig]:
        """全設定値を取得.

        Args:
            prefix: キーのプレフィックスでフィルタ（オプション）

        Returns:
            設定リスト
        """
        query = self.db.query(SystemConfig)
        if prefix:
            query = query.filter(SystemConfig.config_key.startswith(prefix))
        return query.order_by(SystemConfig.config_key).all()


# 設定キー定数
class ConfigKeys:
    """システム設定キー定数."""

    CLOUD_FLOW_URL_MATERIAL_DELIVERY = "cloud_flow_url_material_delivery"
    CLOUD_FLOW_URL_PROGRESS_DOWNLOAD = "cloud_flow_url_progress_download"
