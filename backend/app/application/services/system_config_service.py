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
        """全設定値を取得（デフォルト値とDB値をマージ）.

        Args:
            prefix: キーのプレフィックスでフィルタ（オプション）

        Returns:
            設定リスト（デフォルト値 + DB保存値）
        """
        # DB保存値を取得
        query = self.db.query(SystemConfig)
        if prefix:
            query = query.filter(SystemConfig.config_key.startswith(prefix))
        db_configs = {config.config_key: config for config in query.all()}

        # デフォルト設定とマージ
        result = []
        processed_keys = set()

        # First, process DEFAULT_SETTINGS
        for default in DEFAULT_SETTINGS:
            if prefix and not default["config_key"].startswith(prefix):
                continue

            # DB値があればそれを使用、なければデフォルト値でSystemConfigオブジェクトを作成
            if default["config_key"] in db_configs:
                result.append(db_configs[default["config_key"]])
                processed_keys.add(default["config_key"])
            else:
                # デフォルト値でSystemConfigインスタンスを作成（DBには保存しない）
                config = SystemConfig(
                    config_key=default["config_key"],
                    config_value=default["config_value"],
                    description=default["description"],
                )
                result.append(config)
                processed_keys.add(default["config_key"])

        # Add DB configs that are not in DEFAULT_SETTINGS
        for key, config in db_configs.items():
            if key not in processed_keys:
                result.append(config)

        return sorted(result, key=lambda x: x.config_key)

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


# デフォルト設定値（固定スキーマ）
DEFAULT_SETTINGS = [
    {
        "config_key": "log_level",
        "config_value": "INFO",
        "description": "ログレベル (DEBUG, INFO, WARNING, ERROR, CRITICAL)",
    },
    {
        "config_key": "maintenance_mode",
        "config_value": "false",
        "description": "メンテナンスモード (true/false)",
    },
    {
        "config_key": "enable_db_browser",
        "config_value": "true",
        "description": "DBブラウザ機能の有効化 (true/false)",
    },
    {
        "config_key": "page_visibility",
        "config_value": "{}",
        "description": "ページ表示設定 (JSON形式)",
    },
    {
        "config_key": "cloud_flow_url_material_delivery",
        "config_value": "",
        "description": "材料配送Cloud Flow URL",
    },
    {
        "config_key": "cloud_flow_url_progress_download",
        "config_value": "",
        "description": "進捗ダウンロードCloud Flow URL",
    },
    {
        "config_key": "sql_profiler_enabled",
        "config_value": "false",
        "description": "SQLプロファイラの有効化 (true/false)",
    },
    {
        "config_key": "sql_profiler_threshold_count",
        "config_value": "10",
        "description": "SQL実行数警告しきい値 (回)",
    },
    {
        "config_key": "sql_profiler_threshold_time",
        "config_value": "500",
        "description": "SQL実行時間警告しきい値 (ms)",
    },
    {
        "config_key": "sql_profiler_n_plus_one_threshold",
        "config_value": "5",
        "description": "N+1検知しきい値 (重複回数)",
    },
    {
        "config_key": "sql_profiler_normalize_literals",
        "config_value": "true",
        "description": "SQLリテラルの正規化 (true/false)",
    },
]


# 設定キー定数
class ConfigKeys:
    """システム設定キー定数."""

    CLOUD_FLOW_URL_MATERIAL_DELIVERY = "cloud_flow_url_material_delivery"
    CLOUD_FLOW_URL_PROGRESS_DOWNLOAD = "cloud_flow_url_progress_download"
    ENABLE_DB_BROWSER = "enable_db_browser"
    MAINTENANCE_MODE = "maintenance_mode"
    LOG_LEVEL = "log_level"
    PAGE_VISIBILITY = "page_visibility"

    # SQL Profiler
    SQL_PROFILER_ENABLED = "sql_profiler_enabled"
    SQL_PROFILER_THRESHOLD_COUNT = "sql_profiler_threshold_count"
    SQL_PROFILER_THRESHOLD_TIME = "sql_profiler_threshold_time"
    SQL_PROFILER_N_PLUS_ONE_THRESHOLD = "sql_profiler_n_plus_one_threshold"
    SQL_PROFILER_NORMALIZE_LITERALS = "sql_profiler_normalize_literals"
