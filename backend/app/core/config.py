# backend/app/core/config.py
"""アプリケーション設定 環境変数と定数の管理."""

import os
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション設定クラス."""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )

    # JWT設定
    secret_key: str = Field(
        default="dev-secret-key-change-in-production",
        validation_alias=AliasChoices("SECRET_KEY", "secret_key"),
    )
    algorithm: str = Field(
        default="HS256",
        validation_alias=AliasChoices("ALGORITHM", "algorithm"),
    )
    access_token_expire_minutes: int = Field(
        default=30,
        validation_alias=AliasChoices("ACCESS_TOKEN_EXPIRE_MINUTES", "access_token_expire_minutes"),
    )

    # アプリケーション基本設定
    APP_NAME: str = "ロット管理システム"
    APP_VERSION: str = "2.0.0"
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # データベース設定
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # CORS設定 - 修正版
    # 環境変数が設定されていない場合はデフォルト値を使用
    # 環境変数がある場合はカンマ区切り文字列として受け取る
    CORS_ORIGINS: list[str] | str = Field(
        default=[
            "http://localhost:5173",  # Vite default port
            "http://localhost:3000",  # React default port
            "http://127.0.0.1:5173",
            "http://127.0.0.1:3000",
        ]
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v):
        """CORS_ORIGINSを適切にパース."""
        if isinstance(v, str):
            # カンマ区切り文字列の場合
            if v.strip():
                return [origin.strip() for origin in v.split(",")]
            # 空文字列の場合はデフォルト値を返す
            return [
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173",
                "http://127.0.0.1:3000",
            ]
        # リストの場合はそのまま返す
        return v

    # API設定
    API_PREFIX: str = "/api"
    API_V2_STR: str = "/api/v2"

    # ページネーション設定
    DEFAULT_PAGE_SIZE: int = 100
    MAX_PAGE_SIZE: int = 1000

    # 期限アラート設定 (日数)
    ALERT_EXPIRY_CRITICAL_DAYS: int = 30  # 赤色アラート
    ALERT_EXPIRY_WARNING_DAYS: int = 60  # 黄色アラート

    # 倉庫設定
    DEFAULT_WAREHOUSE_ID: int = int(os.getenv("DEFAULT_WAREHOUSE_ID", "1"))

    # ファイルアップロード設定
    UPLOAD_DIR: Path = Path(__file__).parent.parent.parent / "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # ログ設定
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_DIR: Path = Path(__file__).parent.parent.parent / "logs"
    LOG_FILE_ENABLED: bool = os.getenv("LOG_FILE_ENABLED", "true").lower() == "true"
    LOG_JSON_FORMAT: bool = os.getenv("LOG_JSON_FORMAT", "true").lower() == "true"
    LOG_ROTATION_SIZE: int = int(os.getenv("LOG_ROTATION_SIZE", str(100 * 1024 * 1024)))  # 100MB
    LOG_RETENTION_DAYS: int = int(os.getenv("LOG_RETENTION_DAYS", "30"))
    LOG_BACKUP_COUNT: int = int(os.getenv("LOG_BACKUP_COUNT", "10"))

    # センシティブフィールドのマスキング設定
    LOG_SENSITIVE_FIELDS: list[str] = [
        "password",
        "token",
        "secret",
        "api_key",
        "authorization",
        "cookie",
    ]

    # RPA Cloud Flow Settings
    CLOUD_FLOW_URL_MATERIAL_DELIVERY_NOTE: str = os.getenv(
        "CLOUD_FLOW_URL_MATERIAL_DELIVERY_NOTE", ""
    )
    CLOUD_FLOW_URL_PROGRESS_DOWNLOAD: str = os.getenv("CLOUD_FLOW_URL_PROGRESS_DOWNLOAD", "")


# グローバル設定インスタンス
settings = Settings()

# ディレクトリの作成
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.LOG_DIR.mkdir(parents=True, exist_ok=True)
