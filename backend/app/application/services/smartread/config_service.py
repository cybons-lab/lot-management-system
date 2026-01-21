"""SmartRead Config Service.

設定（SmartReadConfig）のCRUD操作を提供する。
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from sqlalchemy import select

from app.infrastructure.persistence.models import SmartReadConfig

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class SmartReadConfigService:
    """SmartRead設定サービス.

    設定のCRUD操作を提供。
    """

    def __init__(self, session: Session) -> None:
        """初期化.

        Args:
            session: DBセッション
        """
        self.session = session

    def get_config(self, config_id: int) -> SmartReadConfig | None:
        """設定を取得.

        Args:
            config_id: 設定ID

        Returns:
            設定、存在しない場合はNone
        """
        logger.debug(f"設定取得: config_id={config_id}")
        return self.session.get(SmartReadConfig, config_id)

    def get_active_configs(self) -> list[SmartReadConfig]:
        """有効な設定一覧を取得.

        Returns:
            有効な設定のリスト
        """
        logger.debug("有効な設定一覧取得")
        stmt = select(SmartReadConfig).where(SmartReadConfig.is_active.is_(True))
        result = self.session.execute(stmt)
        configs = list(result.scalars().all())
        logger.debug(f"有効な設定数: {len(configs)}")
        return configs

    def get_all_configs(self) -> list[SmartReadConfig]:
        """全設定一覧を取得.

        Returns:
            全設定のリスト
        """
        logger.debug("全設定一覧取得")
        stmt = select(SmartReadConfig).order_by(SmartReadConfig.id)
        result = self.session.execute(stmt)
        configs = list(result.scalars().all())
        logger.debug(f"全設定数: {len(configs)}")
        return configs

    def create_config(
        self,
        endpoint: str,
        api_key: str,
        name: str = "default",
        template_ids: str | None = None,
        export_type: str = "json",
        aggregation_type: str | None = None,
        watch_dir: str | None = None,
        export_dir: str | None = None,
        input_exts: str | None = "pdf,png,jpg,jpeg",
        description: str | None = None,
        is_active: bool = True,
    ) -> SmartReadConfig:
        """設定を作成.

        Args:
            endpoint: APIエンドポイント
            api_key: APIキー
            name: 設定名
            template_ids: テンプレートID（カンマ区切り）
            export_type: エクスポートタイプ
            aggregation_type: 集約タイプ
            watch_dir: 監視ディレクトリ
            export_dir: 出力ディレクトリ
            input_exts: 入力拡張子
            description: 説明
            is_active: 有効/無効

        Returns:
            作成された設定
        """
        logger.info(f"設定作成開始: name={name}")
        config = SmartReadConfig(
            endpoint=endpoint,
            api_key=api_key,
            name=name,
            template_ids=template_ids,
            export_type=export_type,
            aggregation_type=aggregation_type,
            watch_dir=watch_dir,
            export_dir=export_dir,
            input_exts=input_exts,
            description=description,
            is_active=is_active,
        )
        self.session.add(config)
        self.session.flush()
        logger.info(f"設定作成完了: id={config.id}, name={name}")
        return config

    def update_config(
        self,
        config_id: int,
        **kwargs: str | bool | None,
    ) -> SmartReadConfig | None:
        """設定を更新.

        Args:
            config_id: 設定ID
            **kwargs: 更新するフィールド

        Returns:
            更新された設定、存在しない場合はNone
        """
        logger.info(f"設定更新開始: config_id={config_id}")
        config = self.get_config(config_id)
        if config is None:
            logger.warning(f"設定更新失敗: config_id={config_id} が存在しません")
            return None

        for key, value in kwargs.items():
            if hasattr(config, key):
                setattr(config, key, value)

        self.session.flush()
        logger.info(f"設定更新完了: config_id={config_id}")
        return config

    def delete_config(self, config_id: int) -> bool:
        """設定を削除.

        Args:
            config_id: 設定ID

        Returns:
            削除成功したらTrue
        """
        logger.info(f"設定削除開始: config_id={config_id}")
        config = self.get_config(config_id)
        if config is None:
            logger.warning(f"設定削除失敗: config_id={config_id} が存在しません")
            return False

        self.session.delete(config)
        self.session.flush()
        logger.info(f"設定削除完了: config_id={config_id}")
        return True
