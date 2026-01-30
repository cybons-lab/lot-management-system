"""Generate system configuration test data."""

import logging

from sqlalchemy.orm import Session

from app.application.services.system_config_service import DEFAULT_SETTINGS
from app.infrastructure.persistence.models.system_config_model import SystemConfig


logger = logging.getLogger(__name__)


def generate_system_config(db: Session) -> None:
    """システム設定のデフォルト値をDBに初期化.

    Args:
        db: Database session
    """
    logger.info("Initializing system configuration with default values")

    for setting in DEFAULT_SETTINGS:
        # 既存のレコードを確認
        existing = (
            db.query(SystemConfig).filter(SystemConfig.config_key == setting["config_key"]).first()
        )

        if not existing:
            config = SystemConfig(
                config_key=setting["config_key"],
                config_value=setting["config_value"],
                description=setting["description"],
            )
            db.add(config)
            logger.debug(
                "Created system config",
                extra={
                    "config_key": setting["config_key"],
                    "config_value": setting["config_value"],
                },
            )
        else:
            logger.debug(
                "System config already exists",
                extra={"config_key": setting["config_key"]},
            )

    db.commit()
    logger.info("System configuration initialized", extra={"count": len(DEFAULT_SETTINGS)})
