# backend/app/core/config.py
"""
アプリケーション設定
環境変数と定数の管理
"""

import os
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション設定クラス"""

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        extra="ignore",
    )
    # ==== ここが今回のエラーの直接原因 ====
    # .env の大文字キーでも、小文字フィールドでも受け付けられるように alias を設定
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
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{Path(__file__).parent.parent.parent / 'lot_management.db'}"
    )

    # CORS設定
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",  # Vite default port
        "http://localhost:3000",  # React default port
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    # API設定
    API_PREFIX: str = "/api"

    # ページネーション設定
    DEFAULT_PAGE_SIZE: int = 100
    MAX_PAGE_SIZE: int = 1000

    # 期限アラート設定 (日数)
    ALERT_EXPIRY_CRITICAL_DAYS: int = 30  # 赤色アラート
    ALERT_EXPIRY_WARNING_DAYS: int = 60  # 黄色アラート

    # ファイルアップロード設定
    UPLOAD_DIR: Path = Path(__file__).parent.parent.parent / "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # class Config:
    #     case_sensitive = True
    #     env_file = ".env"


# グローバル設定インスタンス
settings = Settings()

# アップロードディレクトリの作成
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
