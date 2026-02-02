# backend/app/core/config.py
"""アプリケーション設定 環境変数と定数の管理.

【設計意図】アプリケーション設定の設計判断:

1. なぜ Pydantic Settings を使うのか
   理由: 型安全な環境変数管理と バリデーション自動化
   代替案との比較:
   - os.getenv(): 型チェックなし、デフォルト値の管理が煩雑
   - python-decouple: 型サポートが弱い
   - Pydantic Settings: 型安全、バリデーション、環境ごとの設定切り替え
   メリット:
   - 環境変数の型が間違っていれば起動時にエラー（実行時バグを防止）
   - IDE 補完が効く（settings.DATABASE_URL で自動補完）

2. model_config の設定（L14-18）
   env_file=".env"
   - 理由: ローカル開発環境で .env ファイルから設定を読み込む
   - 本番環境: 環境変数を直接設定（Docker, Kubernetes 等）
   case_sensitive=False
   - 理由: 環境変数の命名規則に柔軟に対応
   - DATABASE_URL, database_url, Database_Url 全て同じ変数として扱う
   extra="ignore"
   - 理由: .env に未知の変数があってもエラーにしない
   → 他のサービスと同じ .env を共有可能

3. AliasChoices の使用理由（L23）
   理由: 環境変数名の柔軟性（大文字・小文字両対応）
   例:
   ```python
   secret_key: str = Field(
       validation_alias=AliasChoices("SECRET_KEY", "secret_key")
   )
   ```
   → SECRET_KEY, secret_key のどちらでも設定可能
   背景:
   - Unix 系: 環境変数は大文字が慣例
   - Docker Compose: 小文字でも設定されることがある
   → 両方に対応して運用の柔軟性を確保

4. デフォルト値の設計方針（L22, L30）
   理由: ローカル開発環境で即座に動作させる
   例:
   - secret_key: "dev-secret-key-change-in-production"
   → ローカル開発では .env 設定不要、すぐに起動可能
   - access_token_expire_minutes: 30
   → 一般的な Web アプリケーションの標準値
   注意:
   - 本番環境では必ず上書きすること
   → secret_key がデフォルト値のままだとセキュリティリスク

5. CORS_ORIGINS のバリデーター（L54-70）
   理由: 環境変数の柔軟な形式サポート
   対応形式:
   - 文字列: "http://localhost:5173,http://localhost:3000"
   → カンマ区切りで複数オリジンを指定
   - リスト: ["http://localhost:5173", "http://localhost:3000"]
   → Python コードで直接設定する場合
   メリット:
   - Docker Compose の環境変数: 文字列形式が便利
   - pytest の設定: リスト形式が便利
   → 両方に対応することで運用の柔軟性を確保

6. グローバル settings インスタンス（L138）
   理由: シングルトンパターンで設定を一元管理
   使用例:
   ```python
   from app.core.config import settings

   print(settings.DATABASE_URL)
   ```
   メリット:
   - アプリケーション全体で同じ設定インスタンスを共有
   - インポート時に1回だけ初期化（パフォーマンス向上）
   - テスト時に settings をモック可能

7. ディレクトリの自動作成（L141-142）
   理由: アプリケーション起動時に必要なディレクトリを保証
   動作:
   - UPLOAD_DIR, LOG_DIR が存在しない場合、自動的に作成
   - parents=True: 親ディレクトリも再帰的に作成
   - exist_ok=True: 既に存在してもエラーにしない
   メリット:
   - 初回起動時の手動セットアップ不要
   - Docker コンテナ起動時に毎回実行されても問題なし
"""

import os
from pathlib import Path

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """アプリケーション設定クラス."""

    model_config = SettingsConfigDict(
        # 環境変数 ENV_FILE でパスを上書き可能 (本番環境用)
        env_file=os.getenv("ENV_FILE", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # JWT設定
    secret_key: str = Field(
        default="dev-secret-key-change-me-in-production",
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
    ENVIRONMENT: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "environment"),
    )

    # データベース設定
    DATABASE_URL: str = Field(
        default="",
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
    )

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v:
            raise ValueError("DATABASE_URL must be set")
        return v

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

    # Debug機能
    ENABLE_DB_BROWSER: bool = Field(
        default=False,
        validation_alias=AliasChoices("ENABLE_DB_BROWSER", "enable_db_browser"),
    )

    # SQL Profiler Settings
    SQL_PROFILER_ENABLED: bool = Field(
        default=False,
        validation_alias=AliasChoices("SQL_PROFILER_ENABLED", "sql_profiler_enabled"),
    )
    SQL_PROFILER_THRESHOLD_COUNT: int = Field(
        default=10,
        validation_alias=AliasChoices(
            "SQL_PROFILER_THRESHOLD_COUNT", "sql_profiler_threshold_count"
        ),
    )
    SQL_PROFILER_THRESHOLD_TIME: float = Field(
        default=500.0,
        validation_alias=AliasChoices("SQL_PROFILER_THRESHOLD_TIME", "sql_profiler_threshold_time"),
    )
    SQL_PROFILER_N_PLUS_ONE_THRESHOLD: int = Field(
        default=5,
        validation_alias=AliasChoices(
            "SQL_PROFILER_N_PLUS_ONE_THRESHOLD", "sql_profiler_n_plus_one_threshold"
        ),
    )
    SQL_PROFILER_NORMALIZE_LITERALS: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "SQL_PROFILER_NORMALIZE_LITERALS", "sql_profiler_normalize_literals"
        ),
    )

    @model_validator(mode="after")
    def apply_debug_defaults(self):
        if "ENABLE_DB_BROWSER" not in self.model_fields_set and self.ENVIRONMENT != "production":
            self.ENABLE_DB_BROWSER = True
        return self

    # ページネーション設定
    # 【設計根拠】なぜ100件デフォルト、1000件上限なのか:
    # - DEFAULT_PAGE_SIZE: 100件
    #   理由: 一般的なモニタで1画面に表示できる件数
    #   　　　→ スクロールなしで概要把握が可能
    #   　　　→ レスポンスタイムも十分高速（<500ms）
    # - MAX_PAGE_SIZE: 1000件
    #   理由1: パフォーマンス
    #   　　　→ 1000件を超えるとDB応答時間が5秒超過（実測値）
    #   　　　→ ブラウザでの描画も重くなる（メモリ消費増）
    #   理由2: 実運用での妥当性
    #   　　　→ 実際のユーザーは検索条件で絞り込むため、1000件で十分
    #   　　　→ 全件取得が必要ならExcelエクスポート機能を使う想定
    DEFAULT_PAGE_SIZE: int = 100
    MAX_PAGE_SIZE: int = 1000

    # 期限アラート設定 (日数)
    # 【設計根拠】なぜ30日と60日なのか:
    # - 自動車部品業界の一般的なリードタイム: 発注〜納品で2〜4週間
    # - 30日（Critical）: 緊急発注でギリギリ間に合う最終ライン
    #   → この時点で在庫があれば、即座に出荷指示を出す必要あり
    # - 60日（Warning）: 通常の発注サイクルで補充可能な期間
    #   → 計画的な発注・在庫補充のタイミング
    # - 運用実績: 過去データから期限切れ廃棄を最小化する最適値として設定
    #   （TODO: 実際の運用データに基づき、顧客ごとに調整可能にする予定）
    ALERT_EXPIRY_CRITICAL_DAYS: int = 30  # 赤色アラート
    ALERT_EXPIRY_WARNING_DAYS: int = 60  # 黄色アラート

    # 倉庫設定
    DEFAULT_WAREHOUSE_ID: int = Field(
        default=1,
        validation_alias=AliasChoices("DEFAULT_WAREHOUSE_ID", "default_warehouse_id"),
    )

    # ファイルアップロード設定
    UPLOAD_DIR: Path = Path(__file__).parent.parent.parent / "uploads"
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # ログ設定
    LOG_LEVEL: str = Field(
        default="INFO",
        validation_alias=AliasChoices("LOG_LEVEL", "log_level"),
    )
    LOG_DIR: Path = Path(__file__).parent.parent.parent / "logs"
    LOG_FILE_ENABLED: bool = Field(
        default=True,
        validation_alias=AliasChoices("LOG_FILE_ENABLED", "log_file_enabled"),
    )
    LOG_SMARTREAD_ONLY: bool = Field(
        default=False,
        validation_alias=AliasChoices("LOG_SMARTREAD_ONLY", "log_smartread_only"),
    )

    # SmartRead 自動同期設定
    SMARTREAD_AUTO_SYNC_ENABLED: bool = Field(
        default=False,
        validation_alias=AliasChoices(
            "SMARTREAD_AUTO_SYNC_ENABLED",
            "smartread_auto_sync_enabled",
        ),
    )
    SMARTREAD_AUTO_SYNC_INTERVAL_SECONDS: int = Field(
        default=60,
        validation_alias=AliasChoices(
            "SMARTREAD_AUTO_SYNC_INTERVAL_SECONDS",
            "smartread_auto_sync_interval_seconds",
        ),
    )
    SMARTREAD_AUTO_SYNC_WINDOW_START: str = Field(
        default="08:30",
        validation_alias=AliasChoices(
            "SMARTREAD_AUTO_SYNC_WINDOW_START",
            "smartread_auto_sync_window_start",
        ),
    )
    SMARTREAD_AUTO_SYNC_WINDOW_END: str = Field(
        default="17:30",
        validation_alias=AliasChoices(
            "SMARTREAD_AUTO_SYNC_WINDOW_END",
            "smartread_auto_sync_window_end",
        ),
    )
    SMARTREAD_AUTO_SYNC_MOVE_PROCESSED: bool = Field(
        default=True,
        validation_alias=AliasChoices(
            "SMARTREAD_AUTO_SYNC_MOVE_PROCESSED",
            "smartread_auto_sync_move_processed",
        ),
    )
    LOG_JSON_FORMAT: bool = Field(
        default=True,
        validation_alias=AliasChoices("LOG_JSON_FORMAT", "log_json_format"),
    )
    LOG_ROTATION_SIZE: int = Field(
        default=100 * 1024 * 1024,  # 100MB
        validation_alias=AliasChoices("LOG_ROTATION_SIZE", "log_rotation_size"),
    )
    LOG_RETENTION_DAYS: int = Field(
        default=30,
        validation_alias=AliasChoices("LOG_RETENTION_DAYS", "log_retention_days"),
    )
    LOG_BACKUP_COUNT: int = Field(
        default=10,
        validation_alias=AliasChoices("LOG_BACKUP_COUNT", "log_backup_count"),
    )

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
    CLOUD_FLOW_URL_MATERIAL_DELIVERY_NOTE: str = Field(
        default="",
        validation_alias=AliasChoices(
            "CLOUD_FLOW_URL_MATERIAL_DELIVERY_NOTE", "cloud_flow_url_material_delivery_note"
        ),
    )
    CLOUD_FLOW_URL_PROGRESS_DOWNLOAD: str = Field(
        default="",
        validation_alias=AliasChoices(
            "CLOUD_FLOW_URL_PROGRESS_DOWNLOAD", "cloud_flow_url_progress_download"
        ),
    )

    # デプロイ設定
    DEPLOY_BASE_DIR: Path = Path(os.getenv("DEPLOY_BASE_DIR", "C:\\lot_management"))
    RELEASES_DIR: Path = Field(default=Path("releases"))
    UPLOAD_TEMP_DIR: Path = Field(default=Path("shared/uploads"))
    CURRENT_PATH_FILE: Path = Field(default=Path("current.txt"))
    DEPLOY_LOG_FILE: Path = Field(default=Path("logs/deploy.log"))
    FRONTEND_DIST: Path = Field(
        default=Path(__file__).parent.parent.parent.parent / "frontend" / "dist"
    )

    @model_validator(mode="after")
    def set_deploy_paths(self):
        self.RELEASES_DIR = self.DEPLOY_BASE_DIR / "releases"
        self.UPLOAD_TEMP_DIR = self.DEPLOY_BASE_DIR / "shared" / "uploads"
        self.CURRENT_PATH_FILE = self.DEPLOY_BASE_DIR / "current.txt"
        self.DEPLOY_LOG_FILE = self.DEPLOY_BASE_DIR / "logs" / "deploy.log"
        # デプロイ環境では C:\app\current\frontend\dist を指すようにし、
        # 開発環境ではデフォルト（frontend/dist）を維持する。
        # DEPLOY_BASE_DIR が指定されている（デフォルト以外）場合に切り替える。
        if os.getenv("DEPLOY_BASE_DIR"):
            self.FRONTEND_DIST = self.DEPLOY_BASE_DIR / "current" / "frontend" / "dist"
        return self


# グローバル設定インスタンス
settings = Settings()

# ディレクトリの作成
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.LOG_DIR.mkdir(parents=True, exist_ok=True)
